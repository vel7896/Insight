const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Dataset = require('../models/Dataset');

// @route   POST api/datasets/upload
// @desc    Upload a dataset (file content parsed as JSON)
// @access  Private
router.post('/upload', auth, async (req, res) => {
  const { name, data } = req.body;

  try {
    const dataset = new Dataset({
      userId: req.user.id,
      name,
      data
    });

    await dataset.save();

    res.status(201).json({
      message: 'Dataset uploaded successfully',
      dataset: {
        id: dataset._id,
        name: dataset.name,
        createdAt: dataset.createdAt
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/datasets
// @desc    Get all datasets for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const datasets = await Dataset.find({ userId: req.user.id })
      .select('name createdAt')
      .sort({ createdAt: -1 });
    res.json(datasets);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/datasets/:id
// @desc    Get dataset by ID including its extensive data payload
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found or un-authorized' });
    }

    res.json(dataset);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Dataset not found' });
    }
    res.status(500).send('Server Error');
  }
});

const { spawn } = require('child_process');
const path = require('path');

// @route   GET api/datasets/:id/ai-chart
// @desc    Spawn Python script to process dataset into charts
// @access  Private
router.get('/:id/ai-chart', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!dataset) {
      return res.status(404).json({ message: 'Dataset not found or un-authorized' });
    }

    if (!dataset.data || !Array.isArray(dataset.data)) {
       return res.status(400).json({ message: 'Dataset missing tabular payload for AI processing.' });
    }

    // Try 'python' and fallback to 'python3' or 'py' depending on environment, assuming 'python' here
    const scriptPath = path.join(__dirname, '..', 'Ai_chart', 'analyzer.py');
    const pyProcess = spawn('python', [scriptPath]);
    
    let outputData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script exited with code', code, errorData);
        return res.status(500).json({ message: 'AI Analysis Engine failure.', details: errorData });
      }

      try {
        const jsonOut = JSON.parse(outputData);
        res.json(jsonOut);
      } catch (err) {
        res.status(500).json({ message: 'Invalid output from AI Engine', details: outputData });
      }
    });

    // Write data to python stdin
    pyProcess.stdin.write(JSON.stringify(dataset.data));
    pyProcess.stdin.end();

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/datasets/:id
// @desc    Delete a dataset
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id);

    if (!dataset) {
      console.log(`Delete failed: Dataset ${req.params.id} not found`);
      return res.status(404).json({ message: 'Dataset not found' });
    }

    // Double check ownership (userId in model vs req.user.id from JWT)
    if (dataset.userId.toString() !== req.user.id) {
      console.log(`Delete unauthorized: User ${req.user.id} tried to delete dataset belonging to ${dataset.userId}`);
      return res.status(401).json({ message: 'User not authorized to delete this dataset' });
    }

    await Dataset.deleteOne({ _id: req.params.id });
    console.log(`Dataset ${req.params.id} deleted successfully by user ${req.user.id}`);
    res.json({ message: 'Dataset removed successfully' });
  } catch (err) {
    console.error('Delete Route Error:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invalid Dataset ID format' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
