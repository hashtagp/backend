import User from '../models/User.js';
import Banner from '../models/Banner.js';

// Fetch User by ID
export const fetchUserById = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json({success: true, user});
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
    res.status(400).json({ error });
  }
};

//get banner
export const getBanner = async (req, res) => {
  try {
    const banner = await Banner.findOne();
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, error });
  }
};