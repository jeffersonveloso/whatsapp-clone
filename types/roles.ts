export enum UserRole {
	common = "common",
	admin = "admin",
	superAdmin = "superAdmin"
}

export const USER_ROLES = Object.values(UserRole);

export type UserRoleValue = (typeof USER_ROLES)[number];
