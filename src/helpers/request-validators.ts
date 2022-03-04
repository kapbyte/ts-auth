import Joi from "joi";

// Login Request validation
exports.validLoginRequestDetails  = Joi.object({ 
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required() 
});

exports.verifyTokenRequest = Joi.object({ 
  token: Joi.string().min(3).required()
});

exports.forgotPasswordRequest = Joi.object({ 
  password1: Joi.string().min(6).required(),
  password2: Joi.string().min(6).required()
});

exports.emailSignupRequestDetails  = Joi.object({ 
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required() 
});