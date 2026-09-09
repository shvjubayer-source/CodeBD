const adminModel = require('../models/adminModel');

const getDashboardStats = async (req, res) => {
  try {
    const counts = await adminModel.getTotalCounts();
    return res.status(200).json({ success: true, data: counts });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await adminModel.getAllUsers();
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be 'user' or 'admin'" });
    }

    const updatedUser = await adminModel.updateUserRole(userId, role);
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('updateUserRole error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getAllSubmissions = async (req, res) => {
  try {
    const submissions = await adminModel.getAllSubmissions();
    return res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    console.error('getAllSubmissions error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getContests = async (req, res) => {
  try {
    const contests = await adminModel.getAllContests();
    return res.status(200).json({ success: true, data: contests });
  } catch (error) {
    console.error('getContests error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createContest = async (req, res) => {
  try {
    const { title, description, start_time } = req.body;

    if (!title || !description || !start_time) {
      return res.status(400).json({ success: false, message: 'title, description, and start_time are required' });
    }

    const contest = await adminModel.createContest(title, description, start_time);
    return res.status(201).json({ success: true, data: contest });
  } catch (error) {
    console.error('createContest error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const updateContest = async (req, res) => {
  try {
    const contestId = req.params.id;
    const { title, description, start_time } = req.body;

    const updatedContest = await adminModel.updateContest(contestId, title, description, start_time);
    if (!updatedContest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    return res.status(200).json({ success: true, data: updatedContest });
  } catch (error) {
    console.error('updateContest error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteContest = async (req, res) => {
  try {
    const contestId = req.params.id;

    const deletedContest = await adminModel.deleteContest(contestId);
    if (!deletedContest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    return res.status(200).json({ success: true, data: deletedContest });
  } catch (error) {
    console.error('deleteContest error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getTags = async (req, res) => {
  try {
    const tags = await adminModel.getAllTags();
    return res.status(200).json({ success: true, data: tags });
  } catch (error) {
    console.error('getTags error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createTag = async (req, res) => {
  try {
    const { tag_name } = req.body;

    if (!tag_name) {
      return res.status(400).json({ success: false, message: 'tag_name is required' });
    }

    const tag = await adminModel.createTag(tag_name);
    if (!tag) {
      return res.status(409).json({ success: false, message: 'Tag already exists' });
    }

    return res.status(201).json({ success: true, data: tag });
  } catch (error) {
    console.error('createTag error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteTag = async (req, res) => {
  try {
    const tagId = req.params.id;

    const deletedTag = await adminModel.deleteTag(tagId);
    if (!deletedTag) {
      return res.status(404).json({ success: false, message: 'Tag not found' });
    }

    return res.status(200).json({ success: true, data: deletedTag });
  } catch (error) {
    console.error('deleteTag error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  getAllSubmissions,
  getContests,
  createContest,
  updateContest,
  deleteContest,
  getTags,
  createTag,
  deleteTag,
};
