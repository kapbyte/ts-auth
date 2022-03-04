import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user';
import config from '../config/config';
import { PasswordManager } from '../helpers/password-manager';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

const client = require('twilio')(config.ACCOUNT_SID, config.AUTH_TOKEN);
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(config.SENDGRID_API_KEY);

const GoogleClient = new OAuth2Client('1095239571775-plv65brugicj8fdf7e6neuekg8r5par3.apps.googleusercontent.com');

const {  
  validLoginRequestDetails,
  emailSignupRequestDetails,
  verifyTokenRequest,
  forgotPasswordRequest
} = require('../helpers/request-validators');


/**
 * @swagger
 * components:
 *   schemas:
 *     Email: 
 *       type: object
 *       properties:
 *         email: 
 *           type: string
 *           example: johndoe@gmail.com
 *     Token: 
 *       type: object
 *       properties:
 *         token: 
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1ya2VsZWNoaWNoaW5ha2FAZ21haWwuY29tIi
 *     Phone:
 *       type: object
 *       required:
 *         - phoneNumber
 *       properties:
 *         phoneNumber:
 *           type: string
 *           description: The phone number of the customer
 *       example:
 *         phoneNumber: +2348066115071
 *     PhoneVerification:
 *        type: object
 *        required:
 *          - phoneNumber
 *          - password
 *          - code
 *        properties:
 *          phoneNumber:
 *            type: string
 *            description: The phone number of the customer
 *          password:
 *            type: string
 *            description: password of the customer
 *          code:
 *            type: string
 *            description: OTP code sent to the customer
 *        example:
 *          phoneNumber: +2348066115071
 *          password: 123456
 *          code: 7205
 *     EmailLogin:
 *        type: object
 *        required:
 *          - email
 *          - password
 *        properties:
 *          email:
 *            type: string
 *            description: Email of the customer
 *          password:
 *            type: string
 *            description: password of the customer
 *        example:
 *          email: 'johndoe@gmail.com'
 *          password: '123456'
 *     PasswordReset:
 *        type: object
 *        required:
 *          - password1
 *          - password2
 *        properties:
 *          password1:
 *            type: string
 *            description: New password
 *          password2:
 *            type: string
 *            description: Confirm New password
 *        example:
 *          password1: '123456'
 *          password2: '123456'
 */

/**
 * @swagger
 * /auth/api/phoneNumber/signup:
 *   post:
 *     summary: Phone number of user (+2348066115071)
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Phone'
 *     responses:
 *       200:
 *         description: OTP Verification is sent!!
 *       400:
 *         description: Some server error
 */

exports.phoneNumberSignupController = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  const existingUser = await User.findOne({ phoneNumber });

  if (existingUser) {
    return res.status(200).json({ 
      status: false,
      message: 'Phone Number already in use.'
    });
  }

  if (phoneNumber) {
    client
      .verify
      .services(config.SERVICE_SID)
      .verifications
      .create({ to: `${phoneNumber}`, channel: 'sms' })
      .then((data: any) => {
        res.status(200).send({ status: true, message: "OTP Verification is sent!!", data });
      }) 
  } else {
    return res.status(400).send({ message: "Wrong phone number :(", phoneNumber: phoneNumber });
  }
};


/**
 * @swagger
 * /auth/api/phoneNumber/verify:
 *   post:
 *     summary: Verify OTP sent to user phone number during signup 
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PhoneVerification'
 *     responses:
 *       201:
 *         description: User Registration Successful
 *       400:
 *         description: Some server error
*/

exports.verifyPhoneNumberController = async (req: Request, res: Response) => {
  const { phoneNumber, password, code } = req.body;

  if (phoneNumber && code.length === 4) {
    client
      .verify
      .services(config.SERVICE_SID)
      .verificationChecks
      .create({
        to: `+${phoneNumber}`,
        code: code
      })
      .then((data: any) => {
        if (data.status === "expired") {
          // return a otp expired message
          return res.status(400).json({
            message: 'Your OTP has expired! Kindly request for another OTP.'
          });
        }

        if (data.status === "approved") {
          const user = User.build({ 
            phoneNumber: `${phoneNumber}`, 
            password 
          });
          user.save();

          // Generate JWT
          const userJwt = jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, 'secret-key');
          res.status(201).json({ 
            status: true,
            id: user._id, 
            message: 'User Registration Successful',
            token: userJwt
          });
        }
      })
  } else {
    return res.status(400).send({
      message: "Wrong phone number or code :(",
      phoneNumber: phoneNumber,
    })
  }
};


/**
 * @swagger
 * /auth/api/email/signup:
 *   post:
 *     summary: User signs up using email & password
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailLogin'
 *     responses:
 *       200:
 *         description: Verification link sent to user's email
 *       400:
 *         description: Some server error
*/

exports.emailSignupController = async (req: Request, res: Response) => {
  const { error } = emailSignupRequestDetails.validate(req.body);
  if (error) {
    return res.status(401).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { email, password } = req.body;
  const existingUser = await User.findOne({ email });

  // Check if user is already in DB
  if (existingUser) {
    return res.status(200).json({ 
      status: false,
      message: 'Email already in use.'
    });
  }

  // Generate Token
  const token = jwt.sign({ email, password }, 'secret-key', { expiresIn: '5m' });
  console.log('token > ', token);

  const msg = {
    to: `${email}`,
    from: 'kelechi.ndali@gmail.com', 
    subject: 'Account activation link.',
    html: `
      <h3>Welcome to FlipOver.</h3>
      <p>Please click on the link to activate your account</p>
      <a href="${config.CLIENT_URL}/auth/activate/${token}">Activate your account here</a>
      <hr />
    `
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ 
      status: true, 
      message: `Verification link sent to ${email}` 
    });
  } catch (error) {    
    console.log('msg error > ', error);
    return res.status(501).json({
      status: false,
      message: `Something went wrong. Please contact us noreply@gmail.com` 
    });
  }
};


/**
 * @swagger
 * /auth/api/email/verify:
 *   post:
 *     summary: Verify token sent to user's email
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Token'
 *     responses:
 *       201:
 *         description: User Registration Successful.
 *       400:
 *         description: Some server error
*/

exports.emailVerificationController = async (req: Request, res: Response) => {
  const { error } = verifyTokenRequest.validate(req.body);
  if (error) {
    return res.status(401).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { token } = req.body;
  if (token) {
    try {
      const decodedToken = jwt.verify(token, 'secret-key') as jwt.JwtPayload;

      // Check if this user has gone through this process and is already in DB
      const existingUser = await User.findOne({ email: decodedToken.email });
      if (existingUser) {
        return res.status(200).json({ 
          status: false,
          message: `${decodedToken.email} has been verified.`
        });
      }

      // Hash user password
      const hashedPassword = await PasswordManager.toHash(decodedToken.password);

      // Create new user and save to MongoDB
      const user = User.build({ 
        email: `${decodedToken.email}`, 
        password: `${hashedPassword}`
      });
      user.save();

      res.status(201).json({ status: true, id: user._id, message: 'User Registration Successful.' });
    } catch (error) {
      console.log('error > ', error);
      return res.status(400).json({ message: `${error}` });
    }
  } else {
    return res.status(408).json({ status: false, message: "No verification token attached." });
  }
};


/**
 * @swagger
 * /auth/api/email/signin:
 *   post:
 *     summary: Login using email & password
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailLogin'
 *     responses:
 *       200:
 *         description: User login successful
 *       401:
 *         description: Some server error
*/

exports.userEmailLoginController = async (req: Request, res: Response) => {
  const { error } = validLoginRequestDetails.validate(req.body);
  if (error) {
    return res.status(401).json({
      success: false,
      message: error.details[0].message
    });
  }

  const { email, password } = req.body;

  // Check if user is already in MongoDB
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(401).json({
      success: false,
      message: "Email does not exists."
    });
  }

  // Confirm found user password
  const passwordMatch = await PasswordManager.compare(existingUser.password, password);
  if (!passwordMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid password."
    });
  }
  
  // Generate a token and send to client
  const token = jwt.sign({ _id: existingUser._id }, 'secret-key', { expiresIn: '30m' });
  res.status(200).json({ 
    success: true, 
    message: 'Login Successful',
    token, 
    user: existingUser._id 
  });
};


/**
 * @swagger
 * /auth/api/forgot-password:
 *   put:
 *     summary: Password reset API
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Email'
 *     responses:
 *       200:
 *         description: Email has been sent to ${email}. Follow the instruction to set a new password.
 *       400:
 *         description: Some server error
*/

exports.forgotPasswordController = async (req: Request, res: Response) => {
  const { email } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    return res.status(401).json({
      success: false,
      message: "Email does not exists."
    });
  }
  
  // Generate Password Reset Token
  const token = jwt.sign({ _id: existingUser._id }, 'secret-key', { expiresIn: '5m' });
  console.log('reset token -> ', token);

  const msg = {
    to: `${email}`,
    from: 'kelechi.ndali@gmail.com', 
    subject: 'Password forgot link.',
    html: `
      <h3>Welcome to FlipOver.</h3>
      <p>Please use the following link to reset your password.</p>
      <a href="${config.CLIENT_URL}/auth/reset-password/${token}">Create new password</a>
      <hr />
    `
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ 
      status: true, 
      message: `Email has been sent to ${email}. Follow the instruction to set a new password.` 
    });
  } catch (error) {    
    console.log('msg error > ', error);
    return res.status(501).json({
      status: false,
      message: `Something went wrong. Please contact us noreply@gmail.com` 
    });
  }
};

/**
 * @swagger
 * /auth/api/reset-password/:token:
 *   put:
 *     summary: Verify password reset token sent to email
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *     responses:
 *       200:
 *         description: Password changed successfully!.
 *       400:
 *         description: Some server error
*/

exports.resetPasswordController  = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password1, password2 } = req.body;

  const { error } = forgotPasswordRequest.validate(req.body);
  if (error) {
    return res.status(401).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const payload = jwt.verify(token, 'secret-key') as jwt.JwtPayload
    console.log('payload > ', payload._id);

    // validate password1 and password2 should match
    if (password1 !== password2) {
      return res.status(400).json({
        status: false,
        message: `Password does not match!` 
      });
    }

    // find user with payload id and update with new password
    const existingUser = await User.findById(payload._id);
    if (!existingUser) {
      return res.status(401).json({
        success: false,
        message: "User ID not valid."
      });
    }

    // hash password before update user document in DB
    const hashedPassword = await PasswordManager.toHash(password1);
    existingUser.password = hashedPassword;

    existingUser.save();
    res.status(200).json({ 
      status: true,
      id: existingUser._id,
      message: `Password changed successfully!` 
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: `${error}` });
  }
}


/**
 * @swagger
 * /auth/google-auth/login:
 *   post:
 *     summary: Google Login
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Token'
 *     responses:
 *       200:
 *         description: Password changed successfully!.
 *       400:
 *         description: Some server error
*/

exports.googleLoginController  = async (req: Request, res: Response) => {
  const { tokenId } = req.body;

  try {
    const ticket = await GoogleClient.verifyIdToken({ idToken: `${tokenId}`, audience: '1095239571775-plv65brugicj8fdf7e6neuekg8r5par3.apps.googleusercontent.com'});
    const { name, email, email_verified } = ticket.getPayload() as TokenPayload;

    // user email has been verified
    if (email_verified) {
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(401).json({
          success: false,
          message: `${email} does not exists! Pls signup.`
        });
      }

      // Generate a token and send to client
      const token = jwt.sign({ _id: existingUser._id }, 'secret-key', { expiresIn: '30m' });
      res.status(200).json({ success: true, token, user: existingUser._id });
    } else {
      return res.status(401).json({
        success: false,
        message: "Google Email not verified."
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: `${error}` });
  }
};


/**
 * @swagger
 * /auth/google-auth/signup:
 *   post:
 *     summary: Google Signup.
 *     tags: ["Auth operations"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Token'
 *     responses:
 *       200:
 *         description: User Registration Successful.
 *       400:
 *         description: Some server error
*/

exports.googleSignupController  = async (req: Request, res: Response) => {
  const { tokenId } = req.body;

  try {
    const ticket = await GoogleClient.verifyIdToken({ idToken: `${tokenId}`, audience: '1095239571775-plv65brugicj8fdf7e6neuekg8r5par3.apps.googleusercontent.com'});
    const { name, email, email_verified } = ticket.getPayload() as TokenPayload;

    // user email has been verified
    if (email_verified) {
      // check if this email account already in DB
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(401).json({
          success: false,
          message: `${email} already exists! Kindly login."`
        });
      }

      // Hash user password
      const hashedPassword = `secret-key-${email}`;

      // Create new user and save to MongoDB
      const user = User.build({ 
        email: `${email}`, 
        password: `${hashedPassword}`
      });
      user.save();

      // Generate a token and send to client
      const token = jwt.sign({ _id: user._id }, 'secret-key', { expiresIn: '30m' });

      res.status(201).json({ 
        status: true,
        token,
        id: user._id, 
        message: 'User Registration Successful.'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Google Email not verified."
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: `${error}` });
  }
};