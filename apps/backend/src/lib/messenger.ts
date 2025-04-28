import twilio from 'twilio'

const accountSid = `${process.env.TWILIO_ACCOUNT_SID ?? 'ACe445aea4a2b6999ec85d7da94de6fd09'}`;
const authToken = `${process.env.TWILIO_AUTH_TOKEN ?? 'acafe500a254f500c7bd3b9aeb8f1b55'}`
const client = twilio(accountSid, authToken);


export async function sendMessage(mobile: string, otp: string) {
    await client.messages
  .create({
    body: 'Your OTP for Aviator is ' + otp,
    to: `+91${mobile}`, // Text your number
    from: '+15809522577', // From a valid Twilio number
  })
}