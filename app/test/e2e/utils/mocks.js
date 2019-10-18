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

module.exports = {
    createMockUser,
    createMockUserRole
};