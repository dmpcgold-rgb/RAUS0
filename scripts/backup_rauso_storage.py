#!/usr/bin/env python3
"""Export Supabase Storage objects to a local tar archive (no write API calls)."""
import hashlib
import io
import json
import os
import pathlib
import tarfile
import urllib.parse
import urllib.request
from datetime import datetime, timezone

PROJECT = "tznqehoipxkmvhtbgtzy"
BASE = "https://" + PROJECT + ".supabase.co/storage/v1"
KEY = os.environ["RAUSO_STORAGE_SERVICE_ROLE_KEY"]
OUTPUT = pathlib.Path(os.environ["RAUSO_STORAGE_ARCHIVE"])
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY}
MAX_OBJECT = 250 * 1024 * 1024

def request(path, payload=None):
    headers = dict(HEADERS)
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    return urllib.request.urlopen(
        urllib.request.Request(BASE + path, data=data, headers=headers),
        timeout=120,
    )

def safe_part(part):
    if not part or part in (".", "..") or "\x00" in part or "\\" in part:
        raise ValueError("Unsafe storage path")
    return part

def backup_bucket(archive, bucket, manifest):
    prefixes = [""]
    seen = set()
    while prefixes:
        prefix = prefixes.pop()
        if prefix in seen:
            continue
        seen.add(prefix)
        offset = 0
        while True:
            path = "/object/list/" + urllib.parse.quote(bucket, safe="")
            with request(path, {"prefix": prefix, "limit": 100, "offset": offset}) as response:
                entries = json.load(response)
            if not isinstance(entries, list):
                raise ValueError("Unexpected storage listing response")
            for entry in entries:
                name = safe_part(entry["name"])
                object_path = prefix + name
                if entry.get("id") is None:
                    prefixes.append(object_path + "/")
                    continue
                parts = [safe_part(p) for p in object_path.split("/")]
                member = "objects/" + bucket + "/" + "/".join(parts)
                url = "/object/authenticated/" + urllib.parse.quote(bucket, safe="")
                url += "/" + "/".join(urllib.parse.quote(p, safe="") for p in parts)
                with request(url) as response:
                    contents = response.read(MAX_OBJECT + 1)
                if len(contents) > MAX_OBJECT:
                    raise ValueError("Storage object exceeds maximum file size")
                info = tarfile.TarInfo(member)
                info.size = len(contents)
                info.mode = 0o600
                archive.addfile(info, io.BytesIO(contents))
                manifest["objects"].append({
                    "bucket": bucket, "path": object_path,
                    "size": len(contents), "sha256": hashlib.sha256(contents).hexdigest()
                })
            if len(entries) < 100:
                break
            offset += len(entries)

def main():
    with request("/bucket") as response:
        buckets = json.load(response)
    if not isinstance(buckets, list):
        raise ValueError("Unable to enumerate storage buckets")
    manifest = {
        "project": PROJECT,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "buckets": [{"id": b["id"], "public": bool(b.get("public"))} for b in buckets],
        "objects": [],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(OUTPUT, "w") as archive:
        for bucket in buckets:
            bid = safe_part(bucket["id"])
            backup_bucket(archive, bid, manifest)
        payload = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
        info = tarfile.TarInfo("manifest.json")
        info.size = len(payload)
        info.mode = 0o600
        archive.addfile(info, io.BytesIO(payload))
    print("Storage archive created: {} bucket(s), {} file(s)".format(
        len(buckets), len(manifest["objects"])))

if __name__ == "__main__":
    main()
