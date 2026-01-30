const Player = require('./model');
const Game = require('../game/model');
const mongoose = require('mongoose');

const createPlayer = async (request, response) => {
    // Assumes protect middleware ran and attached request.user
    const created_by = request.user._id;

    // Extract player details from request body
    const {
        name,
        instagram_handle,
        profile_image_url,
        bio,
        height_inches,
        weight_lbs,
        position,
        date_of_birth,
        city,
        state
    } = request.body;

    // Basic validation (add more robust validation later, e.g., express-validator)
    if (!name) {
        return response.status(400).json({ message: 'Player name is required' });
    }

    try {
        // Create new player object
        const newPlayer = new Player({
            created_by,
            name,
            instagram_handle,
            profile_image_url,
            bio,
            height_inches,
            weight_lbs,
            position,
            date_of_birth,
            city,
            state
            // overall_stats will and all_time_shot_data will start as an empty array
        });

        // Save the player to the database
        const savedPlayer = await newPlayer.save();

        // Send back the created player data
        response.status(201).json(savedPlayer);

    } catch (error) {
        console.error("Player Creation Error:", error);
        // Handle potential duplicate key errors if unique constraints are added (like unique IG handle)
        if (error.code === 11000) {
            return response.status(400).json({ message: 'Error creating player: A player with that value already exists.' });
        }
        response.status(500).json({ message: 'Server error during player creation' });
    }
};

const updatePlayer = async (request, response) => {
    // params comes from the /:id
    const { id } = request.params;
    // body comes from frontend
    const updates = request.body; // Contains fields to update

    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.status(400).json({ message: 'Invalid player ID format' });
    }

    // Prevent updating protected fields like stats directly via this route
    delete updates.overall_stats;
    delete updates.all_time_shot_data;
    delete updates.created_by;

    try {
        const updatedPlayer = await Player.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!updatedPlayer) {
            return response.status(404).json({ message: 'Player not found' });
        }

        response.status(200).json(updatedPlayer);

    } catch (error) {
        console.error("Player Update Error: ", error);
        response.status(500).json({ message: 'Server error during player update'});
    }
};

const deletePlayer = async (request, response) => {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.status(404).json({ message: 'Player not found'});
    }

    try {
        const deletePlayer = await Player.findByIdAndDelete(id);

        if (!deletePlayer) {
            return response.status(404).json({ message: 'Player not found'});
        }

        return response.status(200).json({ message: 'Player Deleted'});
    } catch (error) {
        console.error("Player Deletion Error: ", error);
        response.status(500).json({ message: 'Server error during player deletion'});
    }
}

const listAllPlayers = async (request, response) => {
    try {
        const page = parseInt(request.query.page) || 1;
        const limit = parseInt(request.query.limit) || 25; 
        const skip = (page - 1) * limit;

        const playersQuery = Player.find() 
            .sort({ name: 1 }) 
            .skip(skip)
            .limit(limit)
            // FIX: Added 'height_inches' and 'weight_lbs' to this list
            .select('_id name instagram_handle profile_image_url position overall_stats height_inches weight_lbs');

        const totalPlayers = await Player.countDocuments();

        const players = await playersQuery;

        response.status(200).json({
            message: 'Players retrieved successfully',
            data: players,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPlayers / limit),
                totalPlayers: totalPlayers
            }
        });

    } catch (error) {
        console.error("List All Players Error:", error);
        response.status(500).json({ message: 'Server error while retrieving players' });
    }
}

const searchPlayers = async (request, response) => {
    const searchTerm = request.query.search;

    if (!searchTerm) {
        return response.status(400).json({ message: 'Search term is required' });
    }

    try {
        const regex = new RegExp(searchTerm, 'i');

        const players = await Player.find({
            $or: [
                { name: regex },
                { instagram_handle: regex }
            ]
        })
        // FIX: Added 'overall_stats' to this list
        .select('_id name instagram_handle profile_image_url position height_inches weight_lbs overall_stats')
        .limit(20); 

        response.status(200).json(players);

    } catch (error) {
        console.error("Player Search Error:", error);
        response.status(500).json({ message: 'Server error during player search' });
    }
};

const getPlayerById = async (request, response) => {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.status(400).json({ message: 'Invalid player ID format' });
    }

    try {
        const player = await Player.findById(id);

        if (!player) {
            return response.status(404).json({ message: 'Player not found' });
        }

        response.status(200).json(player); // Return the full player document

    } catch (error) {
        console.error("Player Retrieval Error:", error);
        response.status(500).json({ message: 'Server error during player retrieval by ID' });
    }
};

const getPlayerRecentGames = async (request, response) => {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.status(400).json({ message: 'Invalid player ID format' });
    }

    try {
        const games = await Game.find({ all_player_ids: id })
            .sort({ createdAt: -1 }) // Sort by creation date, newest first
            .limit(10)
            .select('_id game_type status final_score teams winner createdAt');

        response.status(200).json(games);

    } catch (error) {
        console.error("Recent Game Retrieval Error:", error);
        response.status(500).json({ message: 'Server error during player games retrieval' });
    }
};

const getPlayerShotChart = async (request, response) => {
    const { id } = request.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return response.status(400).json({ message: 'Invalid player ID format' });
    }

    try {
        // Select ONLY the shot data to make the payload small
        const player = await Player.findById(id).select('all_time_shot_data');

        if (!player) {
            return response.status(404).json({ message: 'Player not found' });
        }

        // Return just the array of shots
        response.status(200).json({ shots: player.all_time_shot_data || [] });

    } catch (error) {
        console.error("Shot Chart Retrieval Error:", error);
        response.status(500).json({ message: 'Server error during shot chart retrieval' });
    }
};

const getPlayerShotChartsss = async (request, response) => {
    const { id } = request.params;
    const { gameId } = request.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) return response.status(400).json({ message: 'Invalid player ID format' });

    try {
        // If gameId is provided, get shots from that specific game only
        if (gameId && mongoose.Types.ObjectId.isValid(gameId)) {
            const game = await Game.findById(gameId).lean();
            
            if (!game) {
                return response.status(404).json({ message: 'Game not found' });
            }

            // Extract shots for this player from this specific game (regardless of status)
            const shots = [];
            if (game.events) {
                game.events.forEach(event => {
                    if (event.type === 'shot' && event.player_id.toString() === id) {
                        shots.push({
                            gameId: game._id,
                            location: event.location,
                            made: event.made,
                            points: event.points,
                            timestamp: event.timestamp
                        });
                    }
                });
            }

            return response.status(200).json({
                playerId: id,
                gameId: gameId,
                status: game.status,
                totalShots: shots.length,
                shots: shots
            });
        }

        // If no gameId, get all finished games for this player (career stats)
        const games = await Game.find({ 
            all_player_ids: id,
            status: 'finished'
        }).lean();

        // Extract shot events for this player from all games
        const shots = [];
        games.forEach(game => {
            if (game.events) {
                game.events.forEach(event => {
                    if (event.type === 'shot' && event.player_id.toString() === id) {
                        shots.push({
                            gameId: game._id,
                            location: event.location,
                            made: event.made,
                            points: event.points,
                            timestamp: event.timestamp
                        });
                    }
                });
            }
        });

        return response.status(200).json({
            playerId: id,
            totalShots: shots.length,
            shots: shots
        });
    } catch (error) {
        console.error('Shot Chart Retrieval Error:', error);
        return response.status(500).json({ message: 'Server error during shot chart retrieval' });
    }
}

module.exports = {
    createPlayer,
    updatePlayer,
    deletePlayer,
    searchPlayers,
    listAllPlayers,
    getPlayerShotChart,
    getPlayerById,
    getPlayerRecentGames
};