const express = require('express');
const controller = require('../tables/game/controller');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// -- Admin Functions ---
router.post('/', protect, restrictTo('admin'), controller.createGame);
router.patch('/:id', protect, restrictTo('admin'), controller.updateGame);
router.post('/:id/event', protect, restrictTo('admin'), controller.addGameEvent);
router.delete('/:id/event/:eventId', protect, restrictTo('admin'), controller.removeGameEvent);
router.patch('/:id/finish', protect, restrictTo('admin'), controller.finalizeGame);
router.patch('/:id/cancel', protect, restrictTo('admin'), controller.cancelGame);
router.delete('/:id', protect, restrictTo('admin'), controller.deleteGame);

// --- Public Data Retrieval ---
router.get('/:id', controller.getGameById);
router.get('/', controller.listAllGames);

module.exports = router;