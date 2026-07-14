import { writeSessionStorage } from './storage';

writeSessionStorage('bb-last-list', `${window.location.pathname}${window.location.search}`);
