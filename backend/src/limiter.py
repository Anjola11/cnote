from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.utils.auth import decode_token


def _get_bearer_token(request: Request) -> str | None:
	auth_header = request.headers.get("Authorization")
	if not auth_header or not auth_header.startswith("Bearer "):
		return None
	return auth_header.split(" ", 1)[1].strip() or None


def get_user_id_or_ip(request: Request) -> str:
	"""Rate-limit key: authenticated user id when available, else client IP."""
	token = request.cookies.get("access_token") or _get_bearer_token(request)
	if token:
		try:
			token_data = decode_token(token)
			user_id = token_data.get("sub")
			if user_id:
				return str(user_id)
		except Exception:
			# Any auth/parse error -> fall back to IP
			pass
	return get_remote_address(request)


limiter = Limiter(key_func=get_remote_address)
