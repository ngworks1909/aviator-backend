import axios from 'axios';
export async function sendMessage(mobile: string, otp: string) {

  const sendOtp = async (mobile: string, otp: string) => {

      const API = process.env.SMS_KEY;
      const PHONE = mobile;
      const OTP = otp;
      
      const URL = `https://sms.renflair.in/V1.php?API=${API}&PHONE=${PHONE}&OTP=${OTP}`;
      
      axios.get(URL)
        .then((response: any) => {
          const data = response.data;
          return data
        })
        .catch((error: any) => {
          console.error('Error:', error);
        });
  };
  
  return sendOtp(mobile, otp);
}