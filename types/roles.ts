export enum UserRole {
	Common = "common",
	Admin = "admin",
}

export const USER_ROLES = Object.values(UserRole);

export type UserRoleValue = (typeof USER_ROLES)[number];
