const Task = require("../models/Task");
const { allowedStatuses } = require("../models/Task");
const mongoose = require("mongoose");

// Utility function for date validation
const isFutureDate = (date) => {
    const now = new Date();
    return new Date(date).getTime() > now.getTime();
};

// Strict date validator
const isStrictDate = (dateStr) => {
    if (typeof dateStr !== "string") return false;
    // must match YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    const [y, m, day] = dateStr.split("-").map(Number);
    return (
        d.getUTCFullYear() === y &&
        d.getUTCMonth() + 1 === m &&
        d.getUTCDate() === day
    );
};

exports.createTask = async (req, res, next) => {
    try {
        const { title, description, dueDate, status } = req.body;

        // Basic presence checks (schema also validates deeper)
        if (!title || !dueDate) {
            return res.status(400).json({
                success: false,
                message: "Title and due date are required fields.",
            });
        }

        // Business validation
        if (!isFutureDate(dueDate)) {
            return res.status(400).json({
                success: false,
                message: "Due date must be a future date.",
            });
        }

        // Only allow valid statuses (optional, reinforces schema)
        const allowedStatuses = ["Pending", "In Progress", "Completed"];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
            });
        }

        // Create the task
        const task = await Task.create({
            user: req.user.id,
            title: title.trim(),
            description: description?.trim(),
            dueDate,
            status: status || "Pending",
        });

        // Respond
        res.status(201).json({
            success: true,
            message: "Task created successfully.",
            data: task,
        });

    } catch (err) {
        // Mongoose validation or unexpected errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, errors });
        }
        next(err);
    }
};


exports.getTasks = async (req, res, next) => {
    try {
        const { status, dueDate, startDate, endDate } = req.query;
        const filter = { user: req.user.id };

        // Validate status
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`
            });
        }
        if (status) filter.status = status;

        // Validate date filters
        if (dueDate && !isStrictDate(dueDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid dueDate format. Expected YYYY-MM-DD."
            });
        }

        if (startDate && !isStrictDate(startDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid startDate format. Expected YYYY-MM-DD."
            });
        }

        if (endDate && !isStrictDate(endDate)) {
            return res.status(400).json({
                success: false,
                message: "Invalid endDate format. Expected YYYY-MM-DD."
            });
        }

        // Apply filters
        if (dueDate) {
            filter.dueDate = {
                $gte: new Date(`${dueDate}T00:00:00Z`),
                $lte: new Date(`${dueDate}T23:59:59Z`)
            };
        } else if (startDate || endDate) {
            filter.dueDate = {};
            if (startDate) filter.dueDate.$gte = new Date(`${startDate}T00:00:00Z`);
            if (endDate) filter.dueDate.$lte = new Date(`${endDate}T23:59:59Z`);
        }

        const tasks = await Task.find(filter).sort({ dueDate: 1 });
        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (err) {
        next(err);
    }
};



exports.updateTask = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Prevent updating restricted fields
        const disallowedFields = ["_id", "user", "createdAt"];
        disallowedFields.forEach(field => delete updates[field]);

        // If updating dueDate, validate it
        if (updates.dueDate) {
            if (!isStrictDate(updates.dueDate)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid dueDate format. Expected YYYY-MM-DD."
                });
            }

            const due = new Date(updates.dueDate);
            if (due < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "Due date must be in the future."
                });
            }

            updates.dueDate = new Date(`${updates.dueDate}T00:00:00Z`);
        }

        // Validate allowed status
        if (updates.status && !allowedStatuses.includes(updates.status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`
            });
        }

        // Perform update safely
        const task = await Task.findOneAndUpdate(
            { _id: id, user: req.user.id },
            updates,
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or not authorized."
            });
        }

        res.status(200).json({
            success: true,
            message: "Task updated successfully.",
            data: task
        });
    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, errors });
        }
        next(err);
    }
};



exports.deleteTask = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid task ID format.",
            });
        }

        // Attempt to delete only if task belongs to the logged-in user
        const task = await Task.findOneAndDelete({
            _id: id,
            user: req.user.id,
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found or not authorized to delete.",
            });
        }

        // Success response
        res.status(200).json({
            success: true,
            message: "Task deleted successfully.",
            data: {
                id: task._id,
                title: task.title,
                deletedAt: new Date().toISOString(),
            },
        });
    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, errors });
        }

        next(err);
    }
};


exports.getCount = async (req, res, next) => {
    try {
        const userId = req.params.id; // user ID from URL parameter
        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

        const { start, end } = req.query;
        const filter = { user: new mongoose.Types.ObjectId(userId) };
        const errors = [];

        // Parse start and end datetime
        const startDate = start ? new Date(start) : null;
        const endDate = end ? new Date(end) : null;

        // Validate date & time
        if (start && isNaN(startDate.getTime())) errors.push("Invalid start date/time format.");
        if (end && isNaN(endDate.getTime())) errors.push("Invalid end date/time format.");
        if (startDate && endDate && startDate > endDate)
            errors.push("Start date/time cannot be after end date/time.");

        if (errors.length) 
            return res.status(400).json({ success: false, message: "Invalid input.", errors });

        // Apply date & time range filter
        if (startDate || endDate) {
            filter.dueDate = {};
            if (startDate) filter.dueDate.$gte = new Date(startDate);
            if (endDate) filter.dueDate.$lte = new Date(endDate);
        }

        console.log("filter : ", filter);
        // Aggregate counts by status
        const result = await Task.aggregate([
            { $match: filter },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        console.log("result : ", result)

        const formatted = { Pending: 0, In_Progress: 0, Completed: 0 };
        result.forEach(r => (formatted[r._id] = r.count));

        res.status(200).json({
            success: true,
            message: "Task count retrieved successfully.",
            data: {
                userId,
                filterApplied: { start: startDate, end: endDate },
                counts: formatted
            }
        });

    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === "ValidationError") {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, errors });
        }

        next(err);
    }
};


