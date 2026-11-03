#!/usr/bin/env python3
"""Verify a RAUSO Storage archive without writing files or contacting Supabase."""
import hashlib
import json
import pathlib
import sys
import tarfile

EXPECTED_PROJECT = "tznqehoipxkmvhtbgtzy"

def check(path):
    seen = set()
    with tarfile.open(path, "r:") as archive:
        members = archive.getmembers()
        for member in members:
            if not member.isfile() or member.name in seen:
                raise ValueError("Archive contains an invalid or duplicate entry")
            seen.add(member.name)
            if member.name != "manifest.json" and not member.name.startswith("objects/"):
                raise ValueError("Unexpected archive entry")
        if "manifest.json" not in seen:
            raise ValueError("Missing manifest")
        manifest = json.load(archive.extractfile("manifest.json"))
        if manifest.get("project") != EXPECTED_PROJECT:
            raise ValueError("Incorrect project")
        buckets = manifest.get("buckets")
        objects = manifest.get("objects")
        if not isinstance(buckets, list) or not isinstance(objects, list):
            raise ValueError("Invalid manifest")
        bucket_names = {b["id"] for b in buckets}
        expected = set()
        verified = 0
        for obj in objects:
            bucket = obj["bucket"]
            name = obj["path"]
            parts = name.split("/")
            if bucket not in bucket_names or any(p in ("", ".", "..") for p in [bucket, *parts]):
                raise ValueError("Unsafe object path")
            member_name = "objects/" + bucket + "/" + name
            if member_name in expected:
                raise ValueError("Repeated object")
            expected.add(member_name)
            item = archive.getmember(member_name)
            if item.size != obj["size"]:
                raise ValueError("Incorrect file size")
            digest = hashlib.sha256()
            with archive.extractfile(item) as source:
                for chunk in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(chunk)
            if digest.hexdigest() != obj["sha256"]:
                raise ValueError("Checksum mismatch")
            verified += 1
        if seen != expected | {"manifest.json"}:
            raise ValueError("Archive has missing or unexpected objects")
    print(f"Storage restore verification passed: {len(buckets)} bucket(s), {verified} object(s), all SHA-256 hashes match.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: verify_rauso_storage.py PATH_TO_DECRYPTED_ARCHIVE")
    check(pathlib.Path(sys.argv[1]))
