import { type TeamRoleType } from "@buildingai/constants/shared/team-role.constants";

/**
 * Team member detail DTO
 */
export class TeamMemberDetailDto {
    /**
     * Member ID
     */
    id: string;

    /**
     * Dataset ID
     */
    datasetId: string;

    /**
     * User ID
     */
    userId: string;

    /**
     * Team role
     */
    role: TeamRoleType;

    /**
     * Join time
     */
    createdAt: Date;

    /**
     * Inviter ID
     */
    invitedBy?: string;

    /**
     * Last active time
     */
    lastActiveAt?: Date;

    /**
     * Whether enabled
     */
    isActive: boolean;

    /**
     * Note information
     */
    note?: string;

    /**
     * Update time
     */
    updatedAt: Date;

    // Related information

    /**
     * User information
     */
    user?: {
        id: string;
        username: string;
        email?: string;
        avatar?: string;
        nickname?: string;
    };

    /**
     * Inviter information
     */
    inviter?: {
        id: string;
        username: string;
        nickname?: string;
    };
}
