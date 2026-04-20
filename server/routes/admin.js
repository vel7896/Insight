const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Dataset = require('../models/Dataset');
const Report = require('../models/Report');

// @route   GET api/admin/analytics
// @desc    Get overall platform analytics
// @access  Private/Admin
router.get('/analytics', [auth, adminAuth], async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDatasets = await Dataset.countDocuments();
    const totalReports = await Report.countDocuments();

    const recentDatasets = await Dataset.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentReports = await Report.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalUsers,
      totalDatasets,
      totalReports,
      recentDatasets,
      recentReports
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/admin/users-storage
// @desc    Get users list with their datasets and storage size
// @access  Private/Admin
router.get('/users-storage', [auth, adminAuth], async (req, res) => {
  try {
    const usersData = await User.aggregate([
      {
        $lookup: {
          from: 'datasets',
          localField: '_id',
          foreignField: 'userId',
          as: 'datasets'
        }
      },
      {
        $lookup: {
          from: 'reports',
          localField: '_id',
          foreignField: 'userId',
          as: 'reports'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          createdAt: 1,
          datasetCount: { $size: '$datasets' },
          reportCount: { $size: '$reports' },
          datasetsData: '$datasets.data'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Calculate approx storage size in Node.js to avoid MongoDB strict type errors
    const formattedData = usersData.map(user => {
      let storageSize = 0;
      if (user.datasetsData && Array.isArray(user.datasetsData)) {
        user.datasetsData.forEach(data => {
          try {
            if (data) {
              const str = typeof data === 'string' ? data : JSON.stringify(data);
              storageSize += Buffer.byteLength(str, 'utf8');
            }
          } catch (e) {
            // Ignore stringify errors for circular structure or bizarre mixed types
          }
        });
      }
      
      delete user.datasetsData;
      return {
        ...user,
        storageSize
      };
    });

    res.json(formattedData);
  } catch (err) {
    console.error('Error in /users-storage:', err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user and their associated data
// @access  Private/Admin
router.delete('/users/:id', [auth, adminAuth], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cascade delete associated datasets and reports
    await Dataset.deleteMany({ userId: req.params.id });
    await Report.deleteMany({ userId: req.params.id });
    
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
