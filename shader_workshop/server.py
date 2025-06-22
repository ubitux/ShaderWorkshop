import asyncio
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Self

from aiohttp import WSMsgType, web
from watchdog.events import (DirModifiedEvent, FileModifiedEvent,
                             FileSystemEventHandler)
from watchdog.observers import Observer

from .frag import extract_inc, read_shader

_STATIC_DIR = Path(__file__).resolve().parent / "www"
_EXAMPLES_DIR = Path(__file__).resolve().parent / "frag-examples"
_SHADER_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else _EXAMPLES_DIR).resolve()


class AsyncFileSystemEventHandler(FileSystemEventHandler):
    """Push the watchdog events into the specified queue"""

    def __init__(self, push_queue: asyncio.Queue):
        self._queue = push_queue
        self._loop = asyncio.get_running_loop()

    def on_modified(self, event: DirModifiedEvent | FileModifiedEvent):
        asyncio.run_coroutine_threadsafe(self._queue.put(event), self._loop)


class EventBroadcaster:
    """Forward the content of 1 queue to N sub-queues"""

    def __init__(self, src_queue: asyncio.Queue):
        self._src_queue = src_queue
        self.subscribers = set()

    def subscribe(self, dst_queue: asyncio.Queue):
        self.subscribers.add(dst_queue)

    def unsubscribe(self, dst_queue: asyncio.Queue):
        self.subscribers.discard(dst_queue)

    async def start(self):
        while True:
            event = await self._src_queue.get()
            for dst_queue in self.subscribers:
                await dst_queue.put(event)


def _track_refs(path: Path) -> set[str]:
    ret = set()
    with open(path) as f:
        for line in f:
            inc = extract_inc(line)
            if not inc:
                continue
            ret.add(inc)
            ret |= _track_refs(path.parent / inc)
    return ret


@dataclass
class State:
    """One websocket user context state"""

    frags: list[str]
    selected: str | None

    @classmethod
    def new(cls) -> Self:
        ret = cls(frags=[], selected=None)
        ret.update_reftree()
        return ret

    def update_reftree(self):
        self.reftree = set()
        if self.selected is None:
            return
        self.reftree = _track_refs(_SHADER_DIR / self.selected)
        self.reftree.add(self.selected)
        print(f"{self.selected} -> {self.reftree}")

    def select(self, id: str):
        if id not in self.frags:
            return
        self.selected = id
        self.update_reftree()

    async def refresh(self, ws: web.WebSocketResponse):
        self.frags = sorted(f.name for f in _SHADER_DIR.glob("*.frag"))
        if self.selected not in self.frags:
            self.selected = None
            self.update_reftree()
        await self._send_list(ws)

    async def _send_list(self, ws: web.WebSocketResponse):
        payload = dict(type="list", frags=self.frags)
        await self._send_payload(ws, payload)

    async def send_reload(self, ws: web.WebSocketResponse):
        payload = dict(type="reload")
        await self._send_payload(ws, payload)

    async def _send_payload(self, ws: web.WebSocketResponse, payload: dict):
        # print(f">> {payload}")
        await ws.send_json(payload)


async def _ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    state = State.new()
    await state.refresh(ws)

    fs_events_queue = asyncio.Queue()

    # Process incoming websocket messages (client events)
    async def process_ws_events():
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                payload = json.loads(msg.data)
                state.select(payload["pick"])
            elif msg.type == WSMsgType.ERROR:
                print(f"WebSocket error: {ws.exception()}")

    # Process incoming queue messages (watchdog filesystem events)
    async def process_fs_events():
        request.app["broadcaster"].subscribe(fs_events_queue)
        while True:
            msg: DirModifiedEvent | FileModifiedEvent = await fs_events_queue.get()
            if msg.is_directory:
                print(f"directory {msg.src_path} changed")
                await state.refresh(ws)
            elif Path(str(msg.src_path)).name in state.reftree:
                print(f"change detected in {state.selected}")
                state.update_reftree()
                await state.send_reload(ws)

    # Process both sources in parallel
    try:
        await asyncio.gather(process_ws_events(), process_fs_events())
    except asyncio.CancelledError:
        pass
    finally:
        request.app["broadcaster"].unsubscribe(fs_events_queue)
        await ws.close()

    return ws


async def _index(_):
    return web.FileResponse(_STATIC_DIR / "index.html")


async def _frag(request):
    fname = request.match_info["name"]
    frag = read_shader(_SHADER_DIR / f"{fname}.frag")
    controls = [asdict(c) | dict(type=c.typ) for c in frag.controls]
    data = dict(content=frag.content, refs=frag.refs, controls=controls)
    return web.json_response(data)


async def _init_app():
    app = web.Application()
    app.router.add_get("/", _index)
    app.router.add_static("/static", _STATIC_DIR)
    app.router.add_get("/frag/{name}.frag", _frag)
    app.router.add_get("/ws", _ws_handler)

    print(f"Shader directory: {_SHADER_DIR}")

    # Setup event broadcaster: 1 filewatcher for N websockets
    event_queue = asyncio.Queue()
    app["broadcaster"] = EventBroadcaster(event_queue)
    asyncio.create_task(app["broadcaster"].start())

    # File watcher events handler that will feed the broadcaster
    event_handler = AsyncFileSystemEventHandler(event_queue)

    # Spawn file system observer
    observer = Observer()
    observer.schedule(event_handler, path=_SHADER_DIR.as_posix(), recursive=False)
    observer.start()

    async def on_cleanup(_):
        observer.stop()
        observer.join()

    app.on_cleanup.append(on_cleanup)
    return app


def main():
    web.run_app(_init_app(), host="localhost", port=8080)
