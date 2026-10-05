from fastapi import HTTPException


class ZonaticException(HTTPException):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message


class InvalidApiKeyException(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=401, code="INVALID_API_KEY", message="API key tidak valid")


class ApiKeyRevokedException(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=403, code="API_KEY_REVOKED", message="API key telah dicabut")


class AreaNotFoundError(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=404, code="AREA_NOT_FOUND", message="Wilayah tidak ditemukan")


class InvalidRequestError(ZonaticException):
    def __init__(self, message: str = "Parameter tidak valid.") -> None:
        super().__init__(status_code=400, code="INVALID_REQUEST", message=message)


class InvalidParameterError(ZonaticException):
    """Schema-level request validation failure.

    Raised by the FastAPI `RequestValidationError` handler so that rejected
    query/path parameters keep the public `{"error": {...}}` envelope instead
    of FastAPI's default `{"detail": [...]}` body. The status code stays 422 so
    clients can still distinguish "malformed request" from "valid request that
    could not be satisfied".
    """

    def __init__(self, message: str = "Parameter permintaan tidak valid.") -> None:
        super().__init__(status_code=422, code="INVALID_REQUEST", message=message)


class PostalCodeNotFoundException(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=404, code="POSTAL_CODE_NOT_FOUND", message="Kode pos tidak ditemukan")
