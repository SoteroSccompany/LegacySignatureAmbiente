from __future__ import annotations


class FaceError(Exception):
    def __init__(self, msg: str):
        super().__init__(msg)
        self.msg = msg
