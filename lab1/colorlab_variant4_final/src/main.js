import { ColorConverter } from './model/converter.js';
import { AppView } from './view/appView.js';
import { ColorController } from './controller/colorController.js';

const view = new AppView();
const converter = new ColorConverter();
new ColorController(view, converter);
