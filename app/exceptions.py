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


class InvalidLevelError(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=400, code="INVALID_LEVEL", message="Level tidak valid. Gunakan: province, regency, district, village.")


class InvalidLimitError(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=400, code="INVALID_LIMIT", message="Limit tidak valid. Gunakan angka 1-100.")


class PostalCodeNotFoundException(ZonaticException):
    def __init__(self) -> None:
        super().__init__(status_code=404, code="POSTAL_CODE_NOT_FOUND", message="Kode pos tidak ditemukan")
