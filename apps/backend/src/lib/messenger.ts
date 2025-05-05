import twilio from 'twilio'

const accountSid = `${process.env.TWILIO_ACCOUNT_SID}`;
const authToken = `${process.env.TWILIO_AUTH_TOKEN}`
const client = twilio(accountSid, authToken);


export async function sendMessage(mobile: string, otp: string) {
    await client.messages
  .create({
    body: 'Your OTP for Aviator is ' + otp,
    to: `+91${mobile}`,
    from: '+15809522577', 
  })
}