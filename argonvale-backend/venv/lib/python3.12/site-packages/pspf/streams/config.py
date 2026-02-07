from pydantic import BaseModel

class StreamConfig(BaseModel):
    name: str
    partition_key: str
    # Future: retention policies, etc.
