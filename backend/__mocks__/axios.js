/**
 * Jest manual mock for axios (root-level __mocks__ is picked up automatically).
 * The services call `axios.create(...)` once at load time and keep that client,
 * so we hand them one shared fake client whose `get` the tests control.
 * No test ever touches the real GitHub API.
 */
const client = { get: jest.fn() };

module.exports = {
  create: () => client,
  __client: client,
};