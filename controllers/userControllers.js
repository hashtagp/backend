import User from '../models/User.js';
import Banner from '../models/Banner.js';

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