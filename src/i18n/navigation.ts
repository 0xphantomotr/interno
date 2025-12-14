import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

import {routing} from './routing';

export const {Link, redirect, usePathname, useRouter} =
  createLocalizedPathnamesNavigation(routing);
