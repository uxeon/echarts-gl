import * as echarts from 'echarts/lib/echarts';
import graphicGL from '../../util/graphicGL';
import ViewGL from '../../core/ViewGL';
import PointsBuilder from '../common/PointsBuilder';

import GLViewHelper from '../common/GLViewHelper';

export default echarts.ChartView.extend({

    type: 'scatterGL',

    __ecgl__: true,

    init: function (ecModel, api) {

        this.groupGL = new graphicGL.Node();
        this.viewGL = new ViewGL('orthographic');

        this.viewGL.add(this.groupGL);

        this._pointsBuilderList = [];
        this._currentStep = 0;

        this._sizeScale = 1;

        this._glViewHelper = new GLViewHelper(this.viewGL);

        this.isInit = false;
    },

    render: function (seriesModel, ecModel, api) {
        this.groupGL.removeAll();
        this._glViewHelper.reset(seriesModel, api);

        if (!seriesModel.getData().count()) {
            return;
        }

        var pointsBuilder = this._pointsBuilderList[0];
        if (!pointsBuilder) {
            pointsBuilder = this._pointsBuilderList[0] = new PointsBuilder(true, api);
        }
        this._pointsBuilderList.length = 1;

        this.groupGL.add(pointsBuilder.rootNode);

        this._removeTransformInPoints(seriesModel.getData().getLayout('points'));
        pointsBuilder.update(seriesModel, ecModel, api);
		/*
		 * updateView launched for correct calculation NDCPosition,
	 	 * that needs for correct counting _pick function, for tooltip.
		 */
        pointsBuilder.updateView(this.viewGL.camera);
        this._onceReInitView()
        this.viewGL.setPostEffect(seriesModel.getModel('postEffect'), api);
    },

    _onceReInitView() {
		/* For some reason camera.projectionMatrix in the first render wasn't correct
		 * So we did some reinitialization with correct matrix.
		 */
    	if (!this.isInit) {
      		setTimeout(() => {
				if(this._pointsBuilderList[0]) {
					this._pointsBuilderList[0].updateView(this.viewGL.camera);
					this.isInit = true;
				}
      		}, 0);
    	}
  	},

    incrementalPrepareRender: function (seriesModel, ecModel, api) {
        this.groupGL.removeAll();
        this._glViewHelper.reset(seriesModel, api);

        this._currentStep = 0;

        this.viewGL.setPostEffect(seriesModel.getModel('postEffect'), api);
    },

    incrementalRender: function (params, seriesModel, ecModel, api) {
        if (params.end <= params.start) {
            return;
        }

        var pointsBuilder = this._pointsBuilderList[this._currentStep];
        if (!pointsBuilder) {
            pointsBuilder = new PointsBuilder(true, api);
            this._pointsBuilderList[this._currentStep] = pointsBuilder;
        }
        this.groupGL.add(pointsBuilder.rootNode);

        this._removeTransformInPoints(seriesModel.getData().getLayout('points'));

        pointsBuilder.setSizeScale(this._sizeScale);
        pointsBuilder.update(seriesModel, ecModel, api, params.start, params.end);

        api.getZr().refresh();

        this._currentStep++;
    },

    updateTransform: function (seriesModel, ecModel, api) {
        if (seriesModel.coordinateSystem.getRoamTransform) {
            this._glViewHelper.updateTransform(seriesModel, api);

            var zoom = this._glViewHelper.getZoom();
            var sizeScale = Math.max((seriesModel.get('zoomScale') || 0) * (zoom - 1) + 1, 0);
            this._sizeScale = sizeScale;

            this._pointsBuilderList.forEach(function (pointsBuilder) {
                pointsBuilder.setSizeScale(sizeScale);
            });
        }
    },

    _removeTransformInPoints: function (points) {
        if (!points) {
            return;
        }
        var pt = [];
        for (var i = 0; i < points.length; i += 2) {
            pt[0] = points[i];
            pt[1] = points[i + 1];
            this._glViewHelper.removeTransformInPoint(pt);
            points[i] = pt[0];
            points[i + 1] = pt[1];
        }
    },


    dispose: function () {
        this.groupGL.removeAll();
        this._pointsBuilderList.forEach(function (pointsBuilder) {
            pointsBuilder.dispose();
        });
    },

    remove: function () {
        this.groupGL.removeAll();
    }
});