const User = require('../models/User');

module.exports = async function(req, res, next) {
  try {
    // Assuming auth middleware has already run and populated req.user.id
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.email !== 'vvelmurugan0011@gmail.com') {
      return res.status(403).json({ message: 'Access denied: Admin privileges required.' });
    }

    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
