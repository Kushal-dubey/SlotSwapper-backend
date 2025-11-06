import Event from "../models/Event.js";

/**
 * POST /api/events
 * Create an event for the logged-in user (req.user provided by auth middleware)
 */

export const createEvent = async (req, res) => {
    try{
        const{ title, startTime, endTime} = req.body;

        // Basic Validation
        if ( !title || !startTime || !endTime) {
            return res.status(400).json({msg: " Please Provide title, startTime, endTime"});
        }

        const event = new Event({
            title,
            user: req.user._id,
            startTime : new Date(startTime),
            endTime: new Date(endTime),
            status : "BUSY",
        });

        await event.save();
        return res.status(201).json(event);
    } catch (err) {
        console.error("CreateEvent Error :", err);
        return res.status(500).json({msg: "Server error creating event"});
    }
};

/**
 * GET /api/events
 * Return events owned by logged-in user
 */

export const getMyEvents = async (req, res) => {
    try{
        const events = await Event.find({user: req.user._id}).sort({startTime:1});
        return res.json(events);
    }catch (error) {
        console.error("GetMyEvents error :", err);
        return res.status(500).json({msg: " Server error fetching events"});
    }
};

/**
 * PUT /api/events/:id
 * Update an event. Only the owner can update.
 * Accepts partial updates (title, startTime, endTime, status)
 */

export const updateEvent = async (req, res) => {
    try{
        const event = await Event.findById(req.params.id);
        if(!event) return res.status(404).json({msg: "Event not found"});

        //Authorization only owner can update this

        if(event.user.toString() !== req.user._id.toString()){
            return res.status(403).json({msg: "Not authorized to update this event"});
        }

        const allowed = [ "title","startTime", "endTime", "status"];
        allowed.forEach((key) => {
            if(req.body[key] !== undefined) event[key] = req.body[key];
        });

        await event.save();
        return res.json(event);
    }catch (error) {
        console.error("UpdateEvent error:", err);
    return res.status(500).json({ msg: "Server error updating event" });
    }
};



/**
 * DELETE /api/events/:id
 * Delete event by id. Only owner can delete.
 */

export const deleteEvent = async (req, res) => {
    try{
        const event = await Event. findById(req.params.id);
        if(!event) return res.status(404).json({msg: "Event not found"});

        if(event.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({msg: "Not authorized to delete this event"});
        }

        await event.deleteOne();
        return res.json({msg: " Event Deleted successfully"});
    } catch (error) {
        console.error("DeleteEvent error:" , err);
        return res.status(500).json({msg: "Server error deleting event"});
    }
};