const nock = require('nock');

const createMockUser = (mockUser) => nock(process.env.CT_URL)
    .post(`/auth/user/find-by-ids`, {
        ids: mockUser.map((e) => e.id)
    })
    .reply(200, {
        data: mockUser
    });

const createMockUserRole = (role, userID) => nock(process.env.CT_URL)
    .get(`/auth/user/ids/${role}`)
    .reply(200, { data: [userID] });

const mockUsersForSort = (users) => {
    const betterUsers = users.map((u) => ({ ...u, _id: u.id }));

    // Mock each user request (for includes=user)
    betterUsers.map((user) => createMockUser([user]));

    // Mock all users request (for sorting by user role)
    createMockUser(betterUsers);
};

module.exports = {
    createMockUser,
    createMockUserRole,
    mockUsersForSort
};
