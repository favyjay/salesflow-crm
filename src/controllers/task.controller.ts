import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';
import { TaskStatus, TaskPriority } from '@prisma/client';

/**
 * Creates a new follow-up task.
 */
export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { title, description, dueDate, priority, assignedToId, customerId } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Task title and due date are required' });
    }

    // Explicitly annotate with the TaskPriority type to satisfy the TypeScript compiler
    let taskPriority: TaskPriority = 'MEDIUM';
    if (priority === 'High') taskPriority = 'HIGH';
    if (priority === 'Low') taskPriority = 'LOW';

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        priority: taskPriority,
        status: TaskStatus.PENDING,
        assignedToId: assignedToId || req.user.id, // Defaults to the creator if unassigned
        customerId: customerId || null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: newTask
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error creating task' });
  }
};

/**
 * Fetches all pending and completed tasks assigned to the logged-in user.
 */
export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const userId = req.user.id;

    const tasks = await prisma.task.findMany({
      where: { assignedToId: userId },
      orderBy: [
        { status: 'asc' }, // Pending tasks first
        { dueDate: 'asc' } // Soonest due dates first
      ]
    });

    // Map database properties to structure expected by frontend
    const mappedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.toISOString(),
      priority: task.priority === 'HIGH' ? 'High' : task.priority === 'LOW' ? 'Low' : 'Medium',
      completed: task.status === 'COMPLETED'
    }));

    return res.status(200).json({ success: true, tasks: mappedTasks });
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return res.status(500).json({ error: 'Internal server error fetching tasks' });
  }
};

/**
 * Toggles a task's completion status.
 */
export const updateTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;
    const { completed } = req.body;

    if (completed === undefined) {
      return res.status(400).json({ error: 'Completion status is required' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Check ownership unless user is ADMIN or SALES_MANAGER
    const isElevatedRole = userRole === 'ADMIN' || userRole === 'SALES_MANAGER';

    const task = await prisma.task.findUnique({
      where: { id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!isElevatedRole && task.assignedToId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to modify this task' });
    }

    // Determine database status and completion timestamp
    const dbStatus = completed ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    const completedAt = completed ? new Date() : null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: dbStatus,
        completedAt
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      task: {
        id: updatedTask.id,
        completed: updatedTask.status === 'COMPLETED'
      }
    });
  } catch (error) {
    console.error('Update task status error:', error);
    return res.status(500).json({ error: 'Internal server error updating task status' });
  }
};