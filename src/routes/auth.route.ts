import express from 'express';
const router = express.Router();

const { 
  phoneNumberSignupController,
  verifyPhoneNumberController,
  emailSignupController,
  emailVerificationController,
  userEmailLoginController,
  forgotPasswordController,
  resetPasswordController,
  googleLoginController,
  googleSignupController
} = require('../controllers/auth.controller');

router.post('/api/phoneNumber/signup', phoneNumberSignupController);
router.post('/api/phoneNumber/verify', verifyPhoneNumberController);
router.post('/api/email/signup', emailSignupController);
router.post('/api/email/signin', userEmailLoginController);
router.post('/api/email/verify', emailVerificationController);
router.put('/api/forgot-password', forgotPasswordController);
router.put('/api/reset-password/:token', resetPasswordController);
router.post('/google-auth/login', googleLoginController);
router.post('/google-auth/signup', googleSignupController);

module.exports = router;