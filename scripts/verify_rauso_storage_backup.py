#!/usr/bin/env python3
"""Verify a RAUSO Storage backup from a streamed decrypted TAR; never extract files."""
import hashlib
import json
import sys
import tarfile

def main():
    files = {}
    manifest = None
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|") as archive:
        for member in archive:
            if not member.isfile():
                raise ValueError("Unexpected archive entry type")
            if member.name == "manifest.json":
                if manifest is not None:
                    raise ValueError("Duplicate manifest")
                stream = archive.extractfile(member)
                if member.size > 10_000_000 or stream is None:
                    raise ValueError("Invalid manifest size")
                manifest = json.load(stream)
                continue
            if not member.name.startswith("objects/"):
                raise ValueError("Unexpected archive path")
            parts = member.name.split("/")
            if len(parts) < 3 or any(x in ("", ".", "..") for x in parts):
                raise ValueError("Unsafe archive path")
            if member.name in files:
                raise ValueError("Duplicate archive file")
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Missing archive stream")
            digest = hashlib.sha256()
            size = 0
            while True:
                data = stream.read(1024 * 1024)
                if not data:
                    break
                size += len(data)
                digest.update(data)
            files[member.name] = (size, digest.hexdigest())
    if not isinstance(manifest, dict) or not isinstance(manifest.get("objects"), list):
        raise ValueError("Missing or malformed storage manifest")
    expected = {}
    for obj in manifest["objects"]:
        name = "objects/" + obj["bucket"] + "/" + obj["path"]
        if name in expected:
            raise ValueError("Duplicate manifest object")
        expected[name] = (int(obj["size"]), obj["sha256"])
    if files != expected:
        absent = set(expected) - set(files)
        unexpected = set(files) - set(expected)
        mismatches = [k for k in files.keys() & expected.keys() if files[k] != expected[k]]
        raise ValueError("Storage verification failed: absent={}, unexpected={}, altered={}".format(
            len(absent), len(unexpected), len(mismatches)))
    print("Verified {} Storage files in {} buckets. No production changes.".format(
        len(files), len(manifest.get("buckets", []))))

if __name__ == "__main__":
    main()
