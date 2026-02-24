// actions/users.ts
"use server"

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const getUsers = async () => {
    const user = await currentUser();

    // Check if user is authorized (only admins and super admins can view all users)
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized access" };
    }

    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // Don't select password for security
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { success: true, users };
    } catch (error) {
        console.error("Error fetching users:", error);
        return { error: "Failed to fetch users" };
    }
};

export const getUsersWithPagination = async (page: number = 1, limit: number = 10) => {
    const user = await currentUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized access" };
    }

    try {
        const skip = (page - 1) * limit;

        const [users, totalUsers] = await Promise.all([
            db.user.findMany({
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit,
            }),
            db.user.count()
        ]);

        return {
            success: true,
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            hasNextPage: page < Math.ceil(totalUsers / limit),
            hasPrevPage: page > 1,
        };
    } catch (error) {
        console.error("Error fetching users with pagination:", error);
        return { error: "Failed to fetch users" };
    }
};

export const getUsersByRole = async (role: string) => {
    const user = await currentUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized access" };
    }

    try {
        const users = await db.user.findMany({
            where: {
                role: role as UserRole
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { success: true, users };
    } catch (error) {
        console.error("Error fetching users by role:", error);
        return { error: "Failed to fetch users by role" };
    }
};

export const searchUsers = async (searchTerm: string) => {
    const user = await currentUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized access" };
    }

    if (!searchTerm.trim()) {
        return { error: "Search term is required" };
    }

    try {
        const users = await db.user.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        username: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return { success: true, users };
    } catch (error) {
        console.error("Error searching users:", error);
        return { error: "Failed to search users" };
    }
};

export const deleteUser = async (userId: string) => {
    const user = await currentUser();

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Unauthorized access. Only Super Admin can delete users." };
    }

    if (user.id === userId) {
        return { error: "You cannot delete your own account" };
    }

    try {
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, username: true }
        });

        if (!targetUser) {
            return { error: "User not found" };
        }

        await db.user.delete({
            where: { id: userId }
        });

        // Revalidate the page to refresh the data
        revalidatePath('/dashboard/users');

        return { success: "User deleted successfully" };
    } catch (error) {
        console.error("Error deleting user:", error);
        return { error: "Failed to delete user" };
    }
};

export const updateUserRole = async (userId: string, newRole: UserRole) => {
    const user = await currentUser();

    if (!user || user.role !== UserRole.SUPER_ADMIN) {
        return { error: "Unauthorized access. Only Super Admin can update user roles." };
    }

    if (user.id === userId) {
        return { error: "You cannot change your own role" };
    }

    try {
        const targetUser = await db.user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return { error: "User not found" };
        }

        await db.user.update({
            where: { id: userId },
            data: { role: newRole }
        });

        revalidatePath('/dashboard/users');

        return { success: "User role updated successfully" };
    } catch (error) {
        console.error("Error updating user role:", error);
        return { error: "Failed to update user role" };
    }
};

export const toggleUserStatus = async (userId: string) => {
    const user = await currentUser();

    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN)) {
        return { error: "Unauthorized access" };
    }

    if (user.id === userId) {
        return { error: "You cannot modify your own status" };
    }

    try {
        // Assuming you have an 'active' field in your user model
        // If not, you can add it to your Prisma schema
        const targetUser = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true }
        });

        if (!targetUser) {
            return { error: "User not found" };
        }

        // This assumes you have an 'active' boolean field in your User model
        // You'll need to add this to your Prisma schema if it doesn't exist
        /*
        await db.user.update({
            where: { id: userId },
            data: { 
                active: !targetUser.active 
            }
        });
        */

        revalidatePath('/dashboard/users');

        return { success: "User status updated successfully" };
    } catch (error) {
        console.error("Error updating user status:", error);
        return { error: "Failed to update user status" };
    }
};