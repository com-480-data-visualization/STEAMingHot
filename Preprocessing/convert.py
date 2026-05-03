from common import *
import msgpack

def export_to_msgpack(source_dataset: RawDataset, output_path: str, verbose=True) -> None:
    """Convert a RawDataset (a dict) into a MessagePack file"""

    if verbose:
        log_step(4, 4, f'Exporting dataset to {output_path} in MessagePack format...')

    with open(output_path, "wb") as f:
        packed = msgpack.packb(source_dataset)
        if packed is None:
            raise ValueError("Failed to pack dataset")
        f.write(packed)
        
        if verbose:
            #print number of bytes written
            size = len(packed)
            units = ['B', 'KB', 'MB', 'GB', 'TB']
            unit_index = 0
            while size >= 1000 and unit_index < len(units) - 1:
                size /= 1000
                unit_index += 1
            log_step(4, 4, f'Exported {size:.2f} {units[unit_index]}', done=True)