"""Helper for system resources"""
import logging
import os

import psutil

# resource module is Unix-only, not available on Windows
try:
    import resource
    HAS_RESOURCE = True
except ImportError:
    HAS_RESOURCE = False

log = logging.getLogger(__name__)


def limit_python_memory() -> None:  # pragma: no cover
    """Limit python memory using the cgroups limit"""
    if not HAS_RESOURCE:
        log.info("Resource module not available (Windows), skipping memory limits")
        return
        
    try:
        (orig_soft_limit, orig_hard_limit) = resource.getrlimit(
            resource.RLIMIT_AS
        )

        limit_in_bytes = -1
        limit_in_bytes_95 = -1
        limit_in_bytes_file = '/sys/fs/cgroup/memory/memory.limit_in_bytes'
        if os.path.isfile(limit_in_bytes_file):
            with open(limit_in_bytes_file, encoding="utf-8") as limit:
                limit_in_bytes = int(limit.read())
                limit_in_bytes_95 = int(limit_in_bytes * 0.95)
                resource.setrlimit(
                    resource.RLIMIT_AS, 
                    (limit_in_bytes_95, limit_in_bytes_95)
                )

        virtual_memory = psutil.virtual_memory()

        (soft_limit, hard_limit) = resource.getrlimit(resource.RLIMIT_AS)
        system_mem = psutil.virtual_memory()
        log.info(f"cgroups memory: {limit_in_bytes=}, {limit_in_bytes_95=}; "
                 f"Current mem limits: {soft_limit=} of max {hard_limit=}; "
                 f"Original mem limits: {orig_soft_limit=} of max "
                 f"{orig_hard_limit=}; "
                 f"Current mem usage: {system_mem.used=} of "
                 f"available {system_mem.available=}; "
                 f"System memory: {system_mem}; "
                 f"psutil.virtual_memory: {virtual_memory}")

    except Exception as err:
        # not all systems support resource limits, so warn instead of failing
        log.exception("Error: Failed to get/set memory limits", exc_info=err)
