# Copyright 2023 SUSE LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging.config
import os
from typing import Any, Dict, List


def setup_logging() -> None:
    lvl = "INFO" if not os.getenv("S3GW_DEBUG") else "DEBUG"
    logfile = os.getenv("S3GW_LOG_FILE")
    _setup_logging(lvl, logfile)


def _setup_logging(
    console_level: str,
    log_file: str | None,
) -> None:
    file_handler: Dict[str, Any] | None = None

    if log_file is not None:
        file_handler = {
            "level": "DEBUG",
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "simple",
            "filename": log_file,
            "maxBytes": 10485760,
            "backupCount": 1,
        }

    cfg: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "simple": {
                "format": (
                    "[%(levelname)-5s] %(asctime)s -- %(module)s -- %(message)s"
                ),
                "datefmt": "%Y-%m-%dT%H:%M:%S",
            },
            "colorized": {
                "()": "uvicorn.logging.ColourizedFormatter",
                "format": (
                    "%(levelprefix)s %(asctime)s -- %(module)s -- %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "level": console_level,
                "class": "logging.StreamHandler",
                "formatter": "colorized",
            },
        },
    }

    handlers: List[str] = ["console"]

    if file_handler is not None:
        cfg["handlers"]["log_file"] = file_handler
        handlers.append("log_file")

    cfg["loggers"] = {
        "uvicorn": {
            "level": "DEBUG",
            "handlers": handlers,
            "propagate": "no",
        }
    }
    cfg["root"] = {
        "level": "DEBUG",
        "handlers": handlers,
    }

    logging.config.dictConfig(cfg)
