import User from '../models/User.js';
import Banner from '../models/Banner.js';
import transporter from "../config/emailConfig.js";

const filename = 'userControllers.js';

// Fetch User by ID
export const fetchUserById = async (req, res) => {
  try{
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({success: true, user});
}
catch (error) {
  console.log(`\nError in ${filename}/fetchUserById`);
  console.log(error);
  res.status(400).json({ success: false, error });
}
};

//inquiry submission
export const submitInquiry = async(req,res)=>{
  try{
    console.log(`\n${filename}/submitInquiry: Function called with email inquiry`);
    const { email } = req.body;
    console.log(`Email received: ${email}`);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.log(`${filename}/submitInquiry: Invalid email format: ${email}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }
    console.log(`${filename}/submitInquiry: Email validation successful`);
    
    // Email to admin notification
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'New Inquiry Received',
      html: `
        <h2>New Inquiry Received</h2>
        <p>A new inquiry has been submitted through the website.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Please respond to this inquiry at your earliest convenience.</p>
      `
    };
    console.log(`${filename}/submitInquiry: Admin notification prepared for: ${adminMailOptions.to}`);
    
    // Auto-response to user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Thank you for contacting Dev Creations Gifts',
      html: `
        <h2>Thank You for Your Inquiry</h2>
        <p>Dear Customer,</p>
        <p>Thank you for reaching out to Dev Creations Gifts. We have received your inquiry and our team will get back to you shortly.</p>
        <p>In the meantime, feel free to explore our website for more information about our products and services.</p>
        <br>
        <p>Best Regards,</p>
        <p>The Dev Creations Team</p>
      `
    };
    console.log(`${filename}/submitInquiry: User auto-response prepared for: ${email}`);
    
    // Send both emails
    console.log(`${filename}/submitInquiry: Attempting to send emails...`);
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions)
    ]);
    console.log(`${filename}/submitInquiry: Emails sent successfully`);
    
    // Return success response
    console.log(`${filename}/submitInquiry: Returning success response to client`);
    return res.status(200).json({ 
      success: true, 
      message: 'Inquiry submitted successfully. We will contact you soon.' 
    });
    
  } catch (error) {
    console.log(`\nError in ${filename}/submitInquiry`);
    console.log(error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit inquiry', 
      error: error.message 
    });
  }
}

// Update User
export const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { username, password } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();
    res.status(200).json(user);
  } catch (error) {
    console.log(`\nError in ${filename}/updateUser`);
    console.log(error);
    res.status(400).json({ error });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.log(`\nError in ${filename}/deleteUser`);
    console.log(error);
    res.status(400).json({ error });
  }
};

//get banner
export const getBanner = async (req, res) => {
  try {
    const banner = await Banner.find();
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    console.log(`\nError in ${filename}/getBanner`);
    console.log(error);
    res.status(400).json({ success: false, error });
  }
};