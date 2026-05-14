from fastapi import APIRouter, Depends, status, Response, Cookie, BackgroundTasks, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from .schemas import (
    UserCreateInput,
    UserCreateResponse,
    UserLoginInput,
    UserLoginResponse,
    RenewAccessTokenResponse,
    LogoutResponse,
    VerifyOtpInput,
    ResendOtpInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    ProfileUpdateInput,
    UserProfileResponse,
)
from ..db.main import get_session
from .services import AuthServices
from ..utils.logger import logger
from ..utils.dependencies import get_verified_user
from ..utils.responses import success_response
from ..limiter import get_user_id_or_ip, limiter

auth_router = APIRouter()

def get_auth_services() -> AuthServices:
    return AuthServices()

@auth_router.post('/signup', response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def create_user(
    user_input: UserCreateInput, 
    background_tasks: BackgroundTasks,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info(f"Signup attempt for email: {user_input.email}")
    result = await auth_services.create_user(user_input, session, background_tasks, response, request)
    logger.info(f"Signup successful for email: {user_input.email}")
    return success_response(
        message="Signup successful, an OTP has been sent to your email to verify your account.",
        data=result,
    )

@auth_router.post('/verify-otp', status_code=status.HTTP_200_OK)
@limiter.limit("5/minute", key_func=get_user_id_or_ip)
async def verify_otp(
    otp_input: VerifyOtpInput,
    background_tasks: BackgroundTasks,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info(f"OTP Verification attempt for user ID: {otp_input.uid}")
    result = await auth_services.verify_otp(otp_input, session, background_tasks, response, request)
    message = "OTP verified successfully"
    if otp_input.otp_type == "signup":
        message = "OTP verified successfully."
    return success_response(
        message=message,
        data=result,
    )

@auth_router.post('/resend-otp', status_code=status.HTTP_200_OK)
@limiter.limit("3/hour", key_func=get_user_id_or_ip)
async def resend_otp(
    request: Request,
    resend_otp_input: ResendOtpInput,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info(f"Resend OTP attempt for email: {resend_otp_input.email}")
    result = await auth_services.resend_otp(resend_otp_input, session, background_tasks)
    message = "OTP resent successfully"
    if resend_otp_input.otp_type == "signup":
        message = "Signup OTP resent successfully"
    elif resend_otp_input.otp_type == "forgotpassword":
        message = "Password reset OTP resent successfully"
    return success_response(
        message=message,
        data=result,
    )

@auth_router.post('/forgot-password', status_code=status.HTTP_200_OK)
@limiter.limit("3/hour")
async def forgot_password(
    forgot_password_input: ForgotPasswordInput,
    request: Request,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info(f"Forgot password attempt for email: {forgot_password_input.email}")
    result = await auth_services.forgot_password(forgot_password_input, session, background_tasks)
    return success_response(
        message="An OTP to reset password has been sent to your email.",
        data=result,
    )

@auth_router.post('/reset-password', status_code=status.HTTP_200_OK)
async def reset_password(
    reset_password_input: ResetPasswordInput,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info("Reset password attempt")
    result = await auth_services.reset_password(reset_password_input, session)
    return success_response(
        message="Password reset successfully",
        data=result,
    )

@auth_router.post('/login', response_model=UserLoginResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/15minute")
async def login(
    login_input: UserLoginInput,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services)
):
    logger.info(f"Login attempt for email: {login_input.email}")
    result = await auth_services.login_user(login_input, session, response, request=request)
    logger.info(f"Login successful for email: {login_input.email}")
    return success_response(
        message="Login successful",
        data=result,
    )

@auth_router.post('/renew-access-token', response_model=RenewAccessTokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def renew_access_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services),
    refresh_token: str | None = Cookie(default=None)
):
    logger.info("Renew access token request received.")
    result = await auth_services.renew_access_token(refresh_token, session, response, request)
    logger.info("Access token effectively renewed.")
    return success_response(
        message="Access token renewed",
        data=result,
    )

@auth_router.post('/logout', response_model=LogoutResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def logout(
    request: Request,
    response: Response,
    auth_services: AuthServices = Depends(get_auth_services),
    access_token: str | None = Cookie(default=None),
    refresh_token: str | None = Cookie(default=None)
):
    logger.info("Logout request received.")
    result = await auth_services.logout(response, access_token, refresh_token, request)
    logger.info("Logout successful.")
    return success_response(
        message="Logged out successfully",
        data=result,
    )


@auth_router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def get_me(request: Request, current_user = Depends(get_verified_user), auth_services: AuthServices = Depends(get_auth_services)):
    result = await auth_services.get_me(current_user)
    return success_response(
        message="User details fetched successfully",
        data=result,
    )


@auth_router.patch("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
@limiter.limit("120/minute", key_func=get_user_id_or_ip)
async def update_me(
    request: Request,
    profile_input: ProfileUpdateInput,
    current_user = Depends(get_verified_user),
    session: AsyncSession = Depends(get_session),
    auth_services: AuthServices = Depends(get_auth_services),
):
    result = await auth_services.update_profile(current_user, profile_input, session)
    return success_response(
        message="Profile updated successfully",
        data=result,
    )
