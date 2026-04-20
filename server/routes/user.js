const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Dataset = require('../models/Dataset');
const Report = require('../models/Report');

// @route   GET api/user/stats
// @desc    Get user statistics (counts of datasets and reports)
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const datasetCount = await Dataset.countDocuments({ userId: req.user.id });
    const reportCount = await Report.countDocuments({ userId: req.user.id });
    const user = await User.findById(req.user.id).select('name createdAt');

    res.json({
      name: user.name,
      datasets: datasetCount,
      dashboards: reportCount,
      memberSince: user.createdAt
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
