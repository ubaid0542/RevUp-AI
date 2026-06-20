<!DOCTYPE html>
<html>
<head>
    <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Hello,</h2>
    <p>You requested to reset your password for RevUp AI.</p>
    <p>Please use the following 6-digit OTP to reset your password:</p>
    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        {{ $otp }}
    </div>
    <p>This OTP is valid for 15 minutes. If you did not request a password reset, please ignore this email.</p>
    <br>
    <p>Best regards,</p>
    <p>The RevUp AI Team</p>
</body>
</html>
