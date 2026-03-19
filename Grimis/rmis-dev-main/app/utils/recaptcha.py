import httpx
import os
from decouple import config
from fastapi import HTTPException, status

class ReCaptchaVerifier:
    """Google reCAPTCHA v2 verifier"""

    def __init__(self):
        self.site_key = config("RECAPTCHA_SITE_KEY", default="")
        self.secret_key = config("RECAPTCHA_SECRET_KEY", default="")
        self.verify_url = config("RECAPTCHA_VERIFY_URL", default="https://www.google.com/recaptcha/api/siteverify")
        self.enabled = config("RECAPTCHA_ENABLED", default="false", cast=bool)

    async def verify(self, token: str, remote_ip: str = None) -> bool:
        """
        Verify reCAPTCHA token

        Args:
            token: The reCAPTCHA response token from frontend
            remote_ip: Optional user's IP address

        Returns:
            bool: True if verification successful

        Raises:
            HTTPException: If verification fails
        """
        if not self.enabled:
            # If reCAPTCHA is disabled, always return True (for development)
            return True

        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reCAPTCHA token is required"
            )

        # Prepare data for verification request
        data = {
            "secret": self.secret_key,
            "response": token
        }

        if remote_ip:
            data["remoteip"] = remote_ip

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.verify_url, data=data, timeout=10.0)
                response.raise_for_status()
                result = response.json()

                if result.get("success"):
                    return True
                else:
                    # Get error codes
                    error_codes = result.get("error-codes", [])
                    error_message = self._get_error_message(error_codes)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"reCAPTCHA verification failed: {error_message}"
                    )
        except httpx.HTTPError as e:
            # Network error or Google service unavailable
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"reCAPTCHA service unavailable: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"reCAPTCHA verification error: {str(e)}"
            )

    def _get_error_message(self, error_codes: list) -> str:
        """Convert reCAPTCHA error codes to human-readable messages"""
        error_messages = {
            "missing-input-secret": "Secret key is missing",
            "invalid-input-secret": "Invalid secret key",
            "missing-input-response": "Response token is missing",
            "invalid-input-response": "Invalid response token",
            "bad-request": "Bad request",
            "timeout-or-duplicate": "Token expired or already used",
            "invalid-package-name": "Invalid package name",
            "invalid-action": "Invalid action",
            "invalid-version": "Invalid version",
            "not-using-ordered-score-thresholds": "Score threshold issue",
        }

        if not error_codes:
            return "Unknown error"

        # Return the first error message
        error_code = error_codes[0]
        return error_messages.get(error_code, f"Error: {error_code}")


# Global instance
recaptcha_verifier = ReCaptchaVerifier()


async def verify_recaptcha(token: str, remote_ip: str = None) -> bool:
    """
    Convenience function to verify reCAPTCHA

    Args:
        token: The reCAPTCHA response token
        remote_ip: Optional user's IP address

    Returns:
        bool: True if verification successful
    """
    return await recaptcha_verifier.verify(token, remote_ip)
