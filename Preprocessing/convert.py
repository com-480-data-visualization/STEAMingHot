from common import *
import msgpack

def export_to_msgpack(source_dataset: RawDataset, output_path: str) -> None:
    """Convert a RawDataset (a dict) into a MessagePack file"""
    with open(output_path, "wb") as f:
        packed = msgpack.packb(source_dataset)
        if packed is None:
            raise ValueError("Failed to pack dataset")
        f.write(packed)