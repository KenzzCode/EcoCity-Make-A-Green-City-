/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This shim prevents libraries from trying to polyfill fetch in the browser
// by providing the native fetch as a module export.
const _fetch = window.fetch.bind(window);
const _Headers = window.Headers;
const _Request = window.Request;
const _Response = window.Response;

export { _fetch as fetch, _Headers as Headers, _Request as Request, _Response as Response };
export default _fetch;
