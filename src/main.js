/**
 * Entry point — wires the 3D engine, UI controller, and tweaks panel together.
 */

import './styles/base.css';
import './styles/ui.css';

import { createOrrery } from './engine/orrery3d.js';
import { initUI }       from './ui/controller.js';
import { mountTweaks }  from './ui/tweaks.jsx';

const orrery   = createOrrery();
const uiHandle = initUI(orrery);

mountTweaks(orrery, uiHandle);
