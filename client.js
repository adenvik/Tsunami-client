/*
	Область общих переменных
*/
	var selectedItem,
		selectedItemObj,
		bodySize = 1000,
		stage,
		stageWidth,
		stageHeight,
		mainLayer,
		dragLayer,
		gridLayer,
		gridSize = 10,
		anchorSize = 5,
		toolbarWidth,
		toolbarHeight,
		toolbar,
		toolbarLayer,
		toolbarElementsCount = 0,
		copyObject,
		elemsCount={},
		elems=[],
		imgs = [];
		
	var trigger = false,
		stretch = false, 
		gridShow = true,
		gridUse = false,
		borderVisible = true;
/*
	Область инициализации переменных
*/
	stageWidth =  document.getElementById('center').offsetWidth;
	stageHeight = document.getElementById('center').offsetHeight;
	stage = new Konva.Stage({
		container: 'konva',
		width: stageWidth,
		height: stageHeight
	});
	gridLayer = new Konva.Layer();
	gridLayer.disableHitGraph();
	mainLayer = new Konva.Layer();
	dragLayer = new Konva.Layer();
	stage.add(gridLayer);
	stage.add(mainLayer);
	stage.add(dragLayer);
	//Инициализация панели инструментов
	toolbarWidth = document.getElementById('leftBar').offsetWidth;
	toolbarHeight = document.getElementById('leftBar').offsetHeight;
	var toolbar = new Konva.Stage({
		container: 'leftBar',
		width: toolbarWidth,
		height: toolbarHeight,
		name: 'toolbar'
	});
	var toolbarLayer = new Konva.Layer();
	toolbar.add(toolbarLayer);
		
/*
	Область функций обработчиков на слоях
*/
	/*
		Функция создания сетки
	*/
	function createCanvasCells() {
		var gs = coordToRealValue(gridSize);//coordToBodySize(gridSize);//coordToRealValue(gridSize);
		gridLayer.destroyChildren();
		var count = 0;
		for (var i = 0; i < stageHeight / gs; i++) {
			var line = new Konva.Line({
				points: [0, i * gs, stageWidth, i * gs],
				stroke: 'black',
				strokeWidth: 0.1
			});
			gridLayer.add(line);
		}
		for (var i = 0; i < stageWidth / gs; i++) {
			
			var line = new Konva.Line({
				points: [i * gs, 0, i * gs, stageHeight],
				stroke: 'black',
				strokeWidth: 0.1
			});
			gridLayer.add(line);
		}
		gridLayer.draw();
	}

	//Панель инструментов----------------------------------------------------------------------------------
	toolbar.on('mousedown', function(evt) {
		trigger = true;                          //Переменная, отвечающая за то, происходит ли манипуляции с объектом на toolbar-е
		deselectCurrentItem();
		//Получаем текущую фигуру
		var shape = evt.target.getParent();
		//Копируем ее объект
		var clone = cloneToolbarElement(shape);
		//Включаем возможность "движения"
		clone.group.startDrag();
	});
	toolbar.on('mouseup', function(evt) {
		if(!trigger) return;				//Если мышь попала на панель toolbar, но при этом не было манипуляций с "болванками" - выходим
		//Получаем выбранную фигуру
		var shape = evt.target.getParent();
		//Удаляем фигуру
		shape.destroy();
		//Удаляем элемент из списка
		elems.pop();
		selectedItem = undefined;
		selectedItemObj = undefined;
		toolbarLayer.draw();
		trigger = false;
	});
	toolbar.on('dragend', function(evt){
		//Если мышка вышла за пределы слоя, при этом объект остался на слое панели инструментов - удаляем его
		if (selectedItem != undefined){
			if(findElem(selectedItem).getLayer() == toolbarLayer){
				selectedItem.destroy();
				elems.pop();
				selectedItem = undefined;
				toolbar.draw();
			}
		}
		trigger = false;
	});
	//Основные рабочии слои--------------------------------------------------------------------------------
	stage.on('mousedown', function(evt){
		//Получаем фигуру, на которую попали курсором
		var shape = evt.target;
		//Если мы потянули за якорь - обрабатывать не нужно
		if (shape.name().endsWith('topLeft') ||
			shape.name().endsWith('topRight') ||
			shape.name().endsWith('bottomRight') ||
			shape.name().endsWith('bottomLeft')){
			return;	
		}
		//Получаем группу, которой принадлежит данный объект
		var target = shape.getParent();
		//Убираем выделение с другого объекта, если оно было
		deselectCurrentItem();
		//Устанавливаем выделение текущему
		findElem(target).select(true);
		target.startDrag();
	});
	
	stage.on('dragmove', function(evt){
		if(selectedItemObj != undefined) selectedItemObj.setAlign('none');
	});
	
	stage.on('mouseup', function(evt){
		findPlace_Absolute(selectedItemObj);
		stage.draw();
	});
	
	stage.on('dragend', function(evt){
		trigger = false;                   //Когда объект в области stage - сбрасываем триггер
		propertiesDisplay();
		checkCanvasHeight(selectedItemObj.getY()+selectedItemObj.getHeight());
	});
	
	/*
		Функция для определения места позиционирования объекта
			current - текущий объект, для которого ищется место
			target(не обязательный) - объект, в точке "сброса"
	*/
	function findPlace_Absolute(current, target){
		
		//Если target не передан - проверяем
		if (target == undefined){
			target = mainLayer.getIntersection(selectedItem.getAbsolutePosition(),'Group');
			target = findElem(target);
		}
		
		switch(target){
			case null:	
			case undefined:
				var e = findElemByPos(current.getAbsolutePosition(), current.name);
				//Если такой элемент существует - сдвигаем
				if (e != undefined){
					findPlace_Absolute(current, e);
					return;
				}
				current.parentObj = undefined;
				current.group.position(current.getAbsolutePosition());
				current.setLayer(dragLayer);
				break;
			
			case current:
				break;
				
			default:
				var y = target.getAbsolutePosition().y + target.getHeight();
				if (current.getY() == y) break;
				if (target.type != '<div>'){
					//Смещаем объект вниз
					current.setY(y);
					//И проверяем нет ли у нас чего ниже
					findPlace_Absolute(current);
				}else{
					//Размещаем объект внутри родителя
					current.setX(current.getAbsolutePosition().x - target.getAbsolutePosition().x);
					current.setY(current.getAbsolutePosition().y - target.getAbsolutePosition().y);
					current.parentObj = target;
					current.group.moveTo(target.group);
					target.updateSize();
				}
		}
	}

/*
	Область описания рабочих элементов
*/
	/*
		Функция создания элемента на панели инструментов, с минимально необходимым инструментарием
			type - тип элемента, по которому, при переносе на рабочий слой, будет добавляться начинка
			color - начальный цвет элемента на рабочем слое
			height - высота элемента
	*/
	function toolBarElement(type,color,height){
		this.layer = toolbarLayer;
		this.type = type;
		this.color = color;
		this.align = 'none';
		if (height == undefined || height == null) height = 70;
		//Даем объекту уникальное имя	
		if (elemsCount[this.type] == undefined) {
			elemsCount[this.type] = 0;
			this.name = this.type;
		} else {
			elemsCount[this.type]++;
			this.name = this.type + elemsCount[this.type];
		}
		//Вычисляем положение элемента по вертикали
		var posY = 20;
		if(!elems.length == 0){
			var element = elems[elems.length - 1];
			posY += element.getY() + element.getHeight();
		}
		//Создаем группу
		this.group = new Konva.Group({
			x: parseInt(toolbarWidth / 6),
			y: posY,
			name: this.name
		});
		//Определяем новый объект
		toolbarElementsCount++;
		elems.push(this);
		//Переопредлеяем перемещение группы
		this.group.dragBoundFunc(function(pos) {		
			var x = pos.x, y = pos.y;
			//Для проверки размера - используем контейнер
			var rect = this.get('.'+this.name()+'rect')[0];			
			var position;
			//В зависимости от того, где находится элемент - получаем координаты курсора
			if (this.getStage() == toolbar) {
				//Если объект в области панели инструментов
				position = toolbar.getPointerPosition();
				//Если группа переносится на рабочий слой - переопределяем ее содержимое в соответсвии с ее типом
				if(position.x > toolbar.width()){
					moveToMainLayer(this);
				}
				else{
					if (x < 0) x = 0;
					if (y < 0) y = 0;
					if (y > toolbarHeight - rect.height()) y = toolbarHeight - rect.height();
				}
			} else if (this.getStage() == stage){
				//Иначе объект находится в рабочей области
				position = stage.getPointerPosition();
				if (x < 0) x = 0;
				if (y < 0) y = 0;
				if (x > stageWidth - rect.width()) x = stageWidth - rect.width();
				if (y > stageHeight - rect.height()) y = stageHeight - rect.height();
				//Если используется сетка - выравниваем координаты под сетку
				if (gridUse){
					x = x - (x % gridSize);
					y = y - (y % gridSize);
				}
			}
			//Изменяем координаты в объекте
			return {
				x:parseInt(x),
				y:parseInt(y)
			}
		});
		this.rect = new Konva.Rect({
			x: 0,
			y: 0,
			width: parseInt(toolbarWidth - 2 * (toolbarWidth / 6)), 
			height: height,
			fill: this.color,
			name: this.name+'rect',
			strokeWidth: 0,
			opacity: 1
		});
		this.group.add(this.rect);
		this.borderRect = new Konva.Rect({
			x: 0,
			y: 0,
			width: parseInt(toolbarWidth - 2 * (toolbarWidth / 6)), 
			height: height,
			name: this.name+'BorderRect',
			strokeWidth:0.5,
			stroke: 'black'
		});
		this.group.add(this.borderRect);
		this.groupTypeText = new Konva.Text({
			x: 12,
			y: -15,
			text: this.type,
			name: this.name+'type',
			fontSize: 14,
			fontFamily: 'Calibri',
			fill: '#000000'
		});
		this.group.add(this.groupTypeText);	
		toolbarLayer.add(this.group);
		toolbarLayer.draw();
		/*
			Методы
		*/
		this.getWidth = function(){
			return this.rect.width();
		}
		this.setWidth = function(value){
			this.rect.width(value);
			this.borderRect.width(value);
			this.layer.draw();
		}
		this.getHeight = function(){
			return this.rect.height();
		}
		this.setHeight = function(value){
			this.rect.height(value);
			this.borderRect.height(value);
			this.layer.draw();
		}
		this.getX = function(){
			return this.group.getX();
		}
		this.setX = function(value){
			//if(gridUse) value = value - value % gridSize;
			
			this.group.setX(value);
			this.layer.draw();
		}
		this.getY = function(){
			return this.group.getY();
		}
		this.setY = function(value){
			//if(gridUse) value = value - value % gridSize;
			
			this.group.setY(value);
			this.layer.draw();
		}
		this.setLayer = function(value){
			if(this.parentObj != undefined){
				stage.draw();
				return;
			}
			
			this.group.moveTo(value);
			this.layer.draw();
			this.layer = value;
			//stage.draw();
			this.layer.draw();
		}
		this.getLayer = function(){
			return this.layer;
		}
		this.draw = function(){
			if(this.parentObj != undefined) stage.draw();
			else this.layer.draw();
		}
		this.getAbsolutePosition = function(){
			return this.group.getAbsolutePosition();
		}
		this.borderVisible = function(value){
			if(value) this.borderRect.stroke('#000000');
			else this.borderRect.stroke(undefined);
		}
		this.setName = function(value){
			if(value == undefined || value == "") return;
			this.group.get('.' + this.name + 'rect')[0].name(value+'rect');
			this.name = value;
			this.group.name(value);
		}
		this.getName = function(value){
			return this.name;
		}
		this.setAlign = function(value){
			this.align = value;
			var pObj = this.parentObj == undefined ? mainLayer : this.parentObj;
			
			switch(value){
				case 'left':
					this.setX(0);
					break;
				case 'center':
					var parentCenter = parseInt(pObj.getWidth() / 2);
					this.setX(parentCenter - parseInt(this.getWidth() / 2));
					break;
				case 'right':
					this.setX(pObj.getWidth() - this.getWidth());
					break;
				default:
			}
			this.draw();
		}
		this.getAlign = function(){
			return this.align;
		}
		
		this.setBorderWidth = function(value){
			this.rect.strokeWidth(value);
		}
		
		this.setBorderColor = function(value){
			this.rect.stroke(value);
		}
		
		this.getBorderWidth = function(){
			var retValue = this.rect.strokeWidth();
			return retValue == 0 ? undefined : retValue;
		}
		
		this.getBorderColor = function(){
			return this.rect.stroke();
		}
		
	}
	
	/*
		Функция создания якоря для изменения размера объекта
			object - объект, которому добавляется якорь
			posX - координата якоря по x
			posY - координата якоря по y 
			name - имя якоря
	*/
	function addAnchor(object,posX,posY,name){
		var anchor = new Konva.Rect({
			x:posX,
			y:posY,
			width:anchorSize,
			height:anchorSize,
			stroke:'#666',
			fill:'#ddd',
			strokeWidth:1,
			name:name,
			draggable:true
			//dragOnTop:false
		});
		anchor.on('mousedown touchstart', function () {
			object.group.setDraggable(false);
		});
		anchor.on('mouseup', function(){
			object.group.setDraggable(true);
		});
		anchor.on('dragmove',function(){
			var x = this.getX();
			var y = this.getY();
			if (this.getAbsolutePosition().x < 0) 
				x = 0;
			if (this.getAbsolutePosition().y < 0) 
				y = 0;
			if (this.getAbsolutePosition().x > stageWidth)
				x = stageWidth - object.getAbsolutePosition().x - anchorSize;
			if (this.getAbsolutePosition().y > stageHeight)
				y = stageHeight - object.getAbsolutePosition().y - anchorSize;
			if (gridUse){
				x = x - x % gridSize;
				y = y - y % gridSize;
			}
			this.setX(x);
			this.setY(y);
			update(this);
			object.updateSize();
		});
		anchor.on('dragend', function () {
			object.group.setDraggable(true);
		});
		anchor.on('mouseover', function () {
			var layer = this.getLayer();
			document.body.style.cursor = 'pointer';
			this.setStrokeWidth(2);
			layer.draw();
		});
		anchor.on('mouseout', function () {
			var layer = this.getLayer();
			document.body.style.cursor = 'default';
			this.setStrokeWidth(1);
			layer.draw();
		});
		object.group.add(anchor);
	}
	/*
		Функция обработки передвижения якорей
			anchor - текущий якорь
	*/
	function update(anchor){
		var group = anchor.getParent();
		var object = findElem(group);
		//Находим все якоря группы
		var topLeftAnchor = group.get('.'+group.name()+'topLeft')[0],
			topRightAnchor = group.get('.'+group.name()+'topRight')[0],
			bottomRightAnchor = group.get('.'+group.name()+'bottomRight')[0],
			bottomLeftAnchor = group.get('.'+group.name()+'bottomLeft')[0];
			
		var anchorDelta = 0;
		if (gridUse) anchorDelta = gridSize - anchorSize;
		
		var anchorX = anchor.getX(),
			anchorY = anchor.getY();
		switch(anchor){
			case topLeftAnchor:
				bottomRightAnchor.setX(bottomRightAnchor.getX() - anchorX);
				topRightAnchor.setX(topRightAnchor.getX() - anchorX);
				anchor.setX(0);
				if(topRightAnchor.getX() - topLeftAnchor.getX() > anchorSize * 2){
					object.setX(group.getX() + anchorX);
				}
				bottomRightAnchor.setY(bottomRightAnchor.getY() - anchorY);
				bottomLeftAnchor.setY(bottomLeftAnchor.getY() - anchorY);
				anchor.setY(0);
				if (bottomRightAnchor.getY() - topRightAnchor.getY() > anchorSize * 2){
					object.setY(group.getY() + anchorY);
				}
				break;
			case topRightAnchor:
				bottomRightAnchor.setY(bottomRightAnchor.getY() - anchorY);
				bottomLeftAnchor.setY(bottomLeftAnchor.getY() - anchorY);
				anchor.setY(0);
				if (bottomRightAnchor.getY() - topRightAnchor.getY() > anchorSize * 2){
					object.setY(group.getY() + anchorY);
				}
				topRightAnchor.setX(topRightAnchor.getX() + anchorDelta);
				bottomRightAnchor.setX(anchorX + anchorDelta);
				break;
			case bottomRightAnchor:
				bottomRightAnchor.setX(bottomRightAnchor.getX() + anchorDelta);
				bottomRightAnchor.setY(bottomRightAnchor.getY() + anchorDelta);
				bottomLeftAnchor.setY(anchorY + anchorDelta);
				topRightAnchor.setX(anchorX + anchorDelta);
				break;
			case bottomLeftAnchor:
				bottomRightAnchor.setX(bottomRightAnchor.getX() - anchorX);
				topRightAnchor.setX(topRightAnchor.getX() - anchorX);
				anchor.setX(0);
				if (topRightAnchor.getX() - topLeftAnchor.getX() > anchorSize * 2){
					object.setX(group.getX() + anchorX);
				}
				bottomLeftAnchor.setY(bottomLeftAnchor.getY() + anchorDelta);
				bottomRightAnchor.setY(anchorY + anchorDelta);
				break;
		}
		if(bottomRightAnchor.getY() - topRightAnchor.getY() < anchorSize * 2){
			bottomLeftAnchor.setY(anchorSize * 2);
			bottomRightAnchor.setY(anchorSize * 2);
		}
		if(topRightAnchor.getX() - topLeftAnchor.getX() < anchorSize * 2){
			topRightAnchor.setX(anchorSize * 2);
			bottomRightAnchor.setX(anchorSize * 2);
		}
		
		object.setWidth(topRightAnchor.getX() - topLeftAnchor.getX() + anchorSize);
		object.setHeight(bottomLeftAnchor.getY() - topLeftAnchor.getY() + anchorSize);
	}
	
	/*
		Функция создания копии toolbar-элемента, который можно перенести на рабочий слой
	*/
	function cloneToolbarElement(group){
		var object = findElem(group);
		//Создаем новый элемент с такими же параметрами
		var clone = new toolBarElement(object.type,object.color,object.getHeight());
		//Уменьшаем счетчик, т.к. данный элемент уже не является шаблоном
		toolbarElementsCount--;
		//Устанавливаем ему позицию по умолчанию, где лежит исходный объект
		clone.setX(object.getX());
		clone.setY(object.getY());
		//Добавляем ему возможность перемещения
		clone.group.draggable(true);
		//clone.group.startDrag();
		//Помечаем текущий элемент
		//selectedItem = clone.group;
		//selectedItemObj = clone;
		return clone;
	}
	
	/*
		Функция поиска объекта, соответсвующего полученному графическому объекту
	*/
	function findElem(group){
		if(group == undefined) return undefined;
		
		var elem;
		for(var i = 0; i < elems.length; i++){
			if (elems[i]!=undefined){
				if(elems[i].name == group.getName()){
					elem = elems[i];
					break;
				}
			}
		}
		return elem;
	}
	
	/*
		Функция поиска объекта в данных координатах, с именем, не равному name
	*/
	function findElemByPos(pos, name){
		var elem;
		for(var i = 0; i < elems.length; i++){
			if (elems[i]!=undefined){
				if(elems[i].getX() == pos.x && elems[i].getY() == pos.y && elems[i].name != name){
					elem = elems[i];
					break;
				}
			}
		}
		return elem;
	}
	
	/*
		Функция удаления объекта
	*/
	function deleteObject(){
		if (selectedItem == undefined) return;
		//Находим список детей типа 'Группа' группы которую мы хотим удалить
        var groups = selectedItem.getChildren(function(node){
            return node.getClassName() == 'Group';
        });
        //Если группа лежит на слое, то переносим детей на слой
        if (selectedItem.getParent().getParent() == stage){
            console.log("Родитель - layer");
            groups.forEach(function(group) {
                group.setX(group.getAbsolutePosition().x);
                group.setY(group.getAbsolutePosition().y);
                group.moveTo(mainLayer);
            });
        } else {	//Иначе переносим детей на родителя
            var parentObj = selectedItem.getParent();
            groups.forEach(function(group) {
                group.setX(group.getAbsolutePosition().x - parentObj.getAbsolutePosition().x);
                group.setY(group.getAbsolutePosition().y - parentObj.getAbsolutePosition().y);
                group.moveTo(parentObj);
            });
            console.log("Родитель - "+selectedItem.getParent().name());
        }
		//Находим позицию элемента в списке
		for(var i = toolbarElementsCount; i < elems.length; i++){
			if (selectedItem.name() == elems[i].name){
				//Удаляем и выходим
				elems.splice(i,1);
				break;
			}
		}
		//Удаляем фигуру
        selectedItem.destroy();
		//Обновляем
        selectedItem=undefined;
		selectedItemObj=undefined;
        stage.draw();
        document.getElementById('properties').innerHTML = '';
	}
	
	/*
		Функция переброса фокуса на новый элемент
	*/
	function deselectCurrentItem(){
		if (selectedItemObj != undefined) selectedItemObj.select(false);
	}
	/*
		Функция переноса объекта на общий слой и изменения его содержимого
	*/
	function moveToMainLayer(object){
		//Убираем надпись
		var children = object.getChildren();
		for(var i = 0; i < children.length; i++){
			if (children[i].name() == object.name()+'type'){
				children[i].destroy();
				break;
			}
		}
		//Находим объект и переносим его на рабочий слой
		object = findElem(object);
		object.setLayer(dragLayer);
		delete object.groupTypeText;
		//Добавляем вспомогательное свойство
		object.parentObj = undefined;
		//Добавляем объекту rect, который будет отображать выделение объекта
		object.selectionRect = new Konva.Rect({
			x: 0,
			y: 0,
			width: object.getWidth(),
			height: object.getHeight(),
			fill: undefined,
			opacity: 1,
			stroke: 'red',
			strokeWidth: 1,
			dash: [2,1],
			name: object.name+'selectionRect',
			cornerRadius:1
		});
		object.group.add(object.selectionRect);
		//Добавляем объекту якоря для изменения размеров
		addAnchor(object, 0, 0, object.name + 'topLeft');
		addAnchor(object, object.getWidth() - anchorSize, 0, object.name + 'topRight');
		addAnchor(object, object.getWidth() - anchorSize, object.getHeight() - anchorSize, object.name + 'bottomRight');
		addAnchor(object, 0, object.getHeight() - anchorSize, object.name + 'bottomLeft');
		//-------------------------------------------------------------------------------------------
		object.setName = function(_super){
			return function(){
				var name = arguments[0];
				//this.group.get('.' + this.name + 'selectionRect')[0].name(name + 'selectionRect');
				this.selectionRect.name(name + 'selectionRect');
				this.group.get('.' + this.name + 'topLeft')[0].name(name + 'topLeft');
				this.group.get('.' + this.name + 'topRight')[0].name(name + 'topRight');
				this.group.get('.' + this.name + 'bottomRight')[0].name(name + 'bottomRight');
				this.group.get('.' + this.name + 'bottomLeft')[0].name(name + 'bottomLeft');
				return _super.apply(this,arguments);
			}
		}(object.setName);
		//-------------------------------------------------------------------------------------------
		//Добавляем функции по отображению якорей
		object.showAnchors = function(){
			this.group.get('.' + this.name + 'topLeft')[0].moveToTop();
			this.group.get('.' + this.name + 'topRight')[0].moveToTop();
			this.group.get('.' + this.name + 'bottomRight')[0].moveToTop();
			this.group.get('.' + this.name + 'bottomLeft')[0].moveToTop();
			
			this.group.get('.' + this.name + 'topLeft')[0].show();
			this.group.get('.' + this.name + 'topRight')[0].show();
			this.group.get('.' + this.name + 'bottomRight')[0].show();
			this.group.get('.' + this.name + 'bottomLeft')[0].show();
		}
		object.hideAnchors = function(){
			this.group.get('.' + this.name + 'topLeft')[0].hide();
			this.group.get('.' + this.name + 'topRight')[0].hide();
			this.group.get('.' + this.name + 'bottomRight')[0].hide();
			this.group.get('.' + this.name + 'bottomLeft')[0].hide();
		}
		//Обновляем методы
		object.setWidth = function(value){
			//if(gridUse) value = value - value % gridSize;
				
			this.rect.width(value);
			this.borderRect.width(value);
			this.selectionRect.width(value);
			//Обновляем положение якорей справа
			this.group.get('.' + this.name + 'topRight')[0].setX(value - anchorSize);
			this.group.get('.' + this.name + 'bottomRight')[0].setX(value - anchorSize);
			//this.layer.draw();
			this.draw();
		}
		object.setHeight = function(value){
			//if(gridUse) value = value - value % gridSize;
			
			this.rect.height(value);
			this.selectionRect.height(value);
			this.borderRect.height(value);
			//Обновляем положение якорей снизу
			this.group.get('.' + this.name + 'bottomRight')[0].setY(value - anchorSize);
			this.group.get('.' + this.name + 'bottomLeft')[0].setY(value - anchorSize);
			this.draw();
		}
		object.select = function(value){
			if (value){
				this.selectionRect.stroke('red');
				//this.group.get('.' + this.name + 'selectionRect')[0].stroke('red');
				this.showAnchors();
				this.setLayer(dragLayer);
				selectedItem = this.group;
				selectedItemObj = this;
				selectedItem.moveToTop();
				propertiesDisplay();
			}
			else{
				//this.selectionRect.stroke(undefined);
				this.group.get('.' + this.name + 'selectionRect')[0].stroke(undefined);
				this.hideAnchors();
				this.setLayer(mainLayer);
				selectedItem = undefined;
				selectedItemObj = undefined;
			}
		}
		object.updateSize = function(){
			//Получаем все внутренние объекты
			var groups = this.group.getChildren(function(node){
				return node.getClassName() == 'Group';
			});
			var newWidth = this.getWidth(), 
				newHeight = this.getHeight();
			groups.forEach(function(group) {
				var obj = findElem(group);
				if(newWidth < obj.getX() + obj.getWidth()) newWidth = obj.getX() + obj.getWidth();
				if(newHeight < obj.getY() + obj.getHeight()) newHeight = obj.getY() + obj.getHeight();
			});
			this.setWidth(newWidth);
			this.setHeight(newHeight);
			//Обновляем положение якорей, кроме левого верхнего, т.к. его координаты 0,0
			this.group.get('.' + this.name + 'topRight')[0].setX(newWidth - anchorSize);
			
			this.group.get('.' + this.name + 'bottomRight')[0].setX(newWidth - anchorSize);
			this.group.get('.' + this.name + 'bottomRight')[0].setY(newHeight - anchorSize);
			
			this.group.get('.' + this.name + 'bottomLeft')[0].setY(newHeight - anchorSize);
			if (this.parentObj != undefined){
				this.parentObj.updateSize();
			}
		}
		object.setBGColor = function(value){
			this.rect.fill(value);
			this.draw();
		}
		object.setBGColor(undefined);
		object.getBGColor = function(){
			return this.rect.fill();
		}
		object.setOpacity = function(value){
			this.rect.opacity(value);
			this.draw();
		}
		object.getOpacity = function(){
			return this.rect.opacity();
		}
		//Если используется сетка - масштабируем объект до значения сетки
		if (gridUse){
			object.setWidth(object.getWidth() - object.getWidth() % gridSize);
			object.setHeight(object.getHeight() - object.getHeight() % gridSize);
		}
		/*
			Добавляем функцию, которая будет возвращать список параметров  в виде
				Название параметра - Значение параметра - Объект для отображения - Группа параметра (не обязательный)
			где
				Название параметра - отображаемое название в панеле настроек
				Значение параметра - ...
				Объект для отображения - html-код элемента
				Группа параметра - относится ли объект к другому, более глобальному параметру
		*/
		object.properties = [];
		object.addProperty = function(key, value ,htmlObj, group){
			if (name == undefined) return;
			var property = new Object;
			property.key = key;
			property.funcName = value;
			property.htmlObj = htmlObj;
			property.childProperties = [];
			if(group != undefined){
				for(var i = 0; i < this.properties.length; i++){
					if (this.properties[i].key == group) {
						this.properties[i].childProperties.push(property);
						break;
					}
				}
			}
			else this.properties.push(property);
		}
		object.getPropertyByName = function(value, source){
			var arr = this.properties;
			if (source != undefined) arr = source;
			for(var i = 0; i < arr.length; i++){
				if(arr[i].key == value) return arr[i];
				if (arr[i].childProperties.length != 0) return this.getPropertyByName(value,arr[i].childProperties);
			}
		}
		object.removeProperty = function(value){
			for(var i = 0; i < this.properties.length; i++){
				if (this.properties[i].key == value){
					this.properties.splice(i, 1);
					break;
				}
			}
		}
		
		/*
			Добавляем общие параметры
		*/
		object.getBorderRadius = function(){
			return this.rect.cornerRadius() == 0 ? undefined : this.rect.cornerRadius();
		}
		object.setBorderRadius = function(value){
			this.rect.cornerRadius(value);
		}
		
		object.addProperty('Type','getType',createHtmlObject('input','text'));
		object.addProperty('Left','getX',createHtmlObject('input','number','onChangeX'));
		object.addProperty('Top','getY',createHtmlObject('input','number','onChangeY'));
		object.addProperty('Width','getWidth',createHtmlObject('input','number','onChangeWidth'));
		object.addProperty('Height','getHeight',createHtmlObject('input','number','onChangeHeight'));
		object.addProperty('Align','getAlign',createHtmlObject('select',undefined,'onChangeAlign',['none','left','center','right']));
		object.addProperty('BorderWidth','getBorderWidth',createHtmlObject('input','number','onChangeBorderWidth'));
		object.addProperty('BorderColor','getBorderColor',createHtmlObject('input','color','onChangeBorderColor'));
		object.addProperty('BorderRadius','getBorderRadius',createHtmlObject('input','number','onChangeBorderRadius'));
		object.addProperty('BGColor','getBGColor',createHtmlObject('input','color','onChangeBGColor'));
		//Добавляем специфические элементы в зависимости от типа
		switch(object.type){
			case '<div>':
				//Переопределяем, т.к. может использоваться картинка на заднем фоне
				object.setBGColor = function(value){
					this.setImage(undefined);
					this.rect.fill(value);
					this.draw();
				}
				createImageObj(object);
				object.addProperty('BGImage','getImage',createHtmlObject('input','text','onChangeImage'));
				break;
			case '<p>':
				createInnerText(object);
				object.innerText.text('Simple text');
				object.innerText.width(object.getWidth());
				object.innerText.height(object.getHeight());
				object.setAlignInnerText = function(value){
					if (value == 'left' || value == 'center' || value == 'right'){
						this.innerText.align(value);
					} else this.innerText.align('left');
					this.draw();
				}
				object.getAlignInnerText = function(){
					return this.innerText.align();
				} 
				object.updateSize = function(_super){
					return function(){
						this.innerText.width(this.getWidth() - anchorSize);
						this.innerText.height(this.getHeight() - anchorSize);
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.updateSize();
				object.addProperty('TextAlign','getAlignInnerText',createHtmlObject('select',undefined,'onChangeAlignText',['left','center','right']),'Font');
				break;
			case '<input_text>':
				object.rect.fill('#ffffff');
				object.rect.stroke('black');
				createInnerText(object);
				object.innerText.width(object.getWidth());
				object.innerText.text('Simple text');
				object.setAlignInnerText = function(value){
					if (value == 'left' || value == 'center' || value == 'right'){
						if (value == 'left') this.innerText.align(undefined);
						else this.innerText.align(value);
					} else this.innerText.align(undefined); //left;
					this.draw();
				}
				object.getAlignInnerText = function(){
					return this.innerText.align();
				}
				object.updateSize = function(_super){
					return function(){
						this.innerText.width(this.getWidth() - anchorSize);
						var y = this.getHeight() / 2 - this.innerText.getHeight() / 2;
						y = y < anchorSize ? anchorSize : y;
						this.innerText.y(y);
						
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.updateSize();
				object.addProperty('TextAlign','getAlignInnerText',createHtmlObject('select',undefined,'onChangeAlignText',['left','center','right']),'Font');
				break;
			case '<input_button>':
				object.rect.fill('#e6e6e6');
				object.rect.stroke('black');
				object.rect.strokeWidth(0.5);
				object.setWidth(50);
				createInnerText(object);
				object.innerText.text('Button');
				object.updateSize = function(_super){
					return function(){
						if(this.innerText.getWidth() > this.getWidth()){
							this.setWidth(this.innerText.getWidth() + anchorSize * 2);
						}
						if(this.innerText.getHeight() > this.getHeight()){
							this.setHeight(this.innerText.getHeight() + anchorSize * 2);
						}
						
						var x = this.getWidth() / 2 - this.innerText.width() / 2;
						this.innerText.x(x);
						
						var y = this.getHeight() / 2 - this.innerText.fontSize() / 2;
						y = y < anchorSize ? anchorSize : y;
						this.innerText.y(y);
						
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.updateSize();
				break;
			case '<input_radio>':
				object.setWidth(object.getHeight());
				object.circle = new Konva.Circle({
					name:this.name + 'Circle',
					x:parseInt(object.getHeight() / 2),
					y:parseInt(object.getHeight() / 2),
					radius:parseInt(object.getHeight() / 2),
					fill:'#e6e6e6',
					stroke:'#000000',
					strokeWidth:0.5
				});
				object.checkCircle = new Konva.Circle({
					name:this.name + 'CheckCircle',
					x:parseInt(object.getHeight() / 2),
					y:parseInt(object.getHeight() / 2),
					radius:parseInt(object.getHeight() / 3),
					fill:undefined
				});
				object.group.add(object.circle);
				object.group.add(object.checkCircle);
				object.setChecked = function(value){
					if(value == 'true') this.checkCircle.fill('#000000');
					else this.checkCircle.fill(undefined);
					this.draw();
				}
				object.isChecked = function(){
					return this.checkCircle.fill() != undefined ? true : false;
				}
				object.updateSize = function(_super){
					return function(){
						if(this.getHeight() > this.getWidth()) this.setHeight(this.getWidth());
						if(this.getWidth() > this.getHeight()) this.setWidth(this.getHeight());
						this.circle.x(parseInt(object.getHeight() / 2));
						this.circle.y(parseInt(object.getHeight() / 2));
						this.circle.radius(parseInt(object.getHeight() / 2));
						
						this.checkCircle.x(parseInt(object.getHeight() / 2));
						this.checkCircle.y(parseInt(object.getHeight() / 2));
						this.checkCircle.radius(parseInt(object.getHeight() / 3));
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.addProperty('Checked','isChecked',createHtmlObject('select',undefined,'onChangeChecked',['true','false']));
				break;	
			case '<img>':
				//Удаляем не нужные параметры
				delete object.setBGColor;
				delete object.getBGColor;
				object.removeProperty('BGColor');
				object.rect.fill(undefined);
				createImageObj(object);
				//Картинка по умолчанию
				var url = 'https://pp.userapi.com/c636728/v636728764/55555/_Roua36t_6U.jpg';//'https://pp.vk.me/c636328/v636328764/39540/dgYpGwB2zu4.jpg';
				object.setImage(url);
				object.addProperty('SRC','getImage',createHtmlObject('input','text','onChangeImage'));
				break;
			case '<h1>':
				break;
			default:
				console.log('неизвестный тип: ' + object.type);
		}
		//Отрисовываем
		object.getLayer().draw();
		object.borderVisible(borderVisible);
		object.showAnchors();
		object.select(true);
	}	
	
/*
	Вспомогательные функции для уменьшения количества кода
*/
	function createHtmlObject(name, type, func, values){
		var htmlObj = document.createElement(name);
		if (type != undefined) htmlObj.setAttribute('type',type);
		if (func != undefined) htmlObj.setAttribute('onchange',func+'()');
		if (values != undefined){
			switch(name){
				case 'select':
					values.forEach(function(value) {
						var option = document.createElement('option');
						option.value=value;
						option.text=value;
						htmlObj.appendChild(option);
					});
					break;
				default:
					console.log('Не определился тип htmlObject createHtmlObject');
			}
		}
		return htmlObj;
	}
	
	function createInnerText(object){
		object.innerText = new Konva.Text({
			x: anchorSize,
			y: anchorSize,
			text:'',
			name: object.name+'text',
			fontSize: 14,
			fontFamily: 'Calibri',
			fill: 'black'
		});
		object.group.add(object.innerText);	
		object.setInnerText = function(value){
			this.innerText.text(value);
			this.updateSize();
			this.draw();
		}
		object.setSizeInnerText = function(value){
			this.innerText.fontSize(value);
			this.updateSize();
			this.draw();
		}
		object.setColorInnerText = function(value){
			this.innerText.fill(value);
			this.draw();
		}
		object.setStyleInnerText = function(value){
			if (value == 'normal' || value == 'bold' || value == 'italic'){
				if(value == 'normal') this.innerText.fontStyle(undefined); //normal
				else this.innerText.fontStyle(value);
			} else this.innerText.fontStyle(undefined); //normal
			this.draw();
		}
		object.setFontInnerText = function(value){
			this.innerText.fontFamily(value);
		}
		object.getInnerText = function(){
			return this.innerText.text();
		}
		object.getSizeInnerText = function(){
			return this.innerText.fontSize();
		}
		object.getColorInnerText = function(){
			return this.innerText.fill();
		}
		object.getFontInnerText = function(){
			return this.innerText.fontFamily();
		}
		object.getStyleInnerText = function(){
			return this.innerText.fontStyle();
		}
		object.addProperty('Text','getInnerText',createHtmlObject('input','text','onChangeText'));
		var htmlElement = createHtmlObject('input','text');
		htmlElement.setAttribute('class','fontProperties')
		object.addProperty('Font',undefined,htmlElement);
		object.addProperty('TextFont','getFontInnerText',createHtmlObject('input','text','onChangeTextFont'),'Font');
		object.addProperty('TextSize','getSizeInnerText',createHtmlObject('input','number','onChangeSizeText'),'Font');
		object.addProperty('TextColor','getColorInnerText',createHtmlObject('input','color','onChangeColorText'),'Font');
		object.addProperty('TextStyle','getStyleInnerText',createHtmlObject('select',undefined,'onChangeStyleText',['normal','italic','bold']),'Font');
	}
	
	function createImageObj(object){
		object.imageObj = new Konva.Image({
			x: 0,
			y: 0,
			image:undefined,
			name:object.name+'image',
			width:object.getWidth(),
			height:object.getHeight()
		});	
		object.group.add(object.imageObj);
		//value - ссылка на картинку
		object.setImage = function(value){
			//Если ссылка пуста - стираем картинку
			if (value == undefined){
				this.imageObj.image(undefined);
				this.draw();
				return;
			}
			if (!existImg(value)){
				this.imageObj.image(undefined);
				this.draw();
				return;
			}
			//Иначе создаем переменную
			var newImage = new Image();
			newImage.src = value;
			//Загружаем картинку и по мере загрузки прорисовываем
			newImage.onload = function(){
				object.draw();
			}
			
			//и добавляем в наш объект
			this.imageObj.image(newImage);
			this.showAnchors();
		}
		object.getImage = function(){
			return this.imageObj.image() == undefined ? undefined : this.imageObj.image().src;
		}
		object.updateSize = function(_super){
			return function(){
				this.imageObj.width(this.getWidth());
				this.imageObj.height(this.getHeight());
				return _super.apply(this,arguments);
			}
		}(object.updateSize);
	}

	/*
		Функция динамического создания таблицы со свойствами под выбранный элемент
	*/
	function propertiesDisplay(){
		var propertiesBar = document.getElementById('properties');
        //Очищаем содержимое
        propertiesBar.innerHTML = '';
		//Создаем таблицу свойств
		var table = document.createElement('table');
        //Наполняем
		selectedItemObj.properties.forEach(function(property){
			//Получаем объект от функции
			var obj = toTableRow(selectedItemObj, property);
			//Если это не кортеж {объект, дочернии объекты} - просто добавляем
			if (obj.length == undefined) table.appendChild(obj);
			else{
				//Иначе добавляем сначала родительский объект
				table.appendChild(obj[0]);
				//А после все его дочернии
				obj[1].forEach(function(value){
					table.appendChild(value);
				});
			}
		});
		//Помещяем таблицу в нужный объект
		propertiesBar.appendChild(table);
	}
	
	/*
		Функция создания строки html - таблицы со свойством
			object - текущий объект
			property - текущее свойство
			group - родительское свойство
	*/
	function toTableRow(object, property, group){
		//Инициализируем строку таблицы
		var tr = document.createElement('tr');
		var td0 = document.createElement('td'),
			td1 = document.createElement('td');
		tr.appendChild(td0);
		tr.appendChild(td1);
		//Если объект является дочерним - добавляем ему класс, чтобы данная строка могла скрываться
		if (group != undefined){
			tr.setAttribute('class','hide'+group);
			tr.setAttribute('style','display:none');
		}
		//Если у параметра есть дочернии - добавляем ему специальный знак, и disabled
		if (property.childProperties.length != 0){
			//Добавляем функцию-обработчик onclick
			tr.setAttribute('onclick','hide'+property.key+'()');
			tr.setAttribute('style','cursor:pointer');
			td0.appendChild(document.createTextNode(property.key + '?!'));
			var input = property.htmlObj;
			td1.appendChild(input);
			//Т.к. тут будет только ряд свойств, например Font, то проверяем их
			switch(property.key){
				case 'Font':
					input.setAttribute('value',object.getSizeInnerText() + ', ' + object.getFontInnerText());
					break;
				default:
			}
			//Делаем не изменяемым
			input.setAttribute('style','width:90%; cursor:pointer');
			input.disabled = true;
			//И добавляем все дочернии
			var mas = [];
			property.childProperties.forEach(function(childProperty){
				mas.push(toTableRow(object, childProperty, property.key));
			});
			return [tr, mas];
		}
		//Иначе идем по стандартному обходу свойств
		else {
			//Выставляем имя
			td0.appendChild(document.createTextNode(property.key));
			var htmlElement = property.htmlObj;
			htmlElement.setAttribute('style','width:90%');
			var currentValue;
			//Дописываем некоторые атрибуты
			switch(htmlElement.nodeName){
				case 'INPUT':
					currentValue = getCurrentValue(object, property.funcName);

					if(currentValue != undefined) htmlElement.value = currentValue;
					else htmlElement.value = htmlElement.defaultValue;
					
					if(property.key=='Type') htmlElement.disabled = true;
					break;
				case 'SELECT':
					htmlElement.value = getCurrentValue(object, property.funcName);
					break;
				case 'TEXTAREA':
					htmlElement.setAttribute('style','width:90%; resize:vertical');
					htmlElement.innerHTML = '';
					htmlElement.appendChild(document.createTextNode(getCurrentValue(object,property.funcName)));
					break;
				default:
			}
			td1.appendChild(htmlElement);
			//Для специфический свойств добавляем дополнительные элементы
			if(property.key == 'BGColor'){
				htmlElement.setAttribute('name','INPBGColor');
				//добавляем поле для отображения hex значения
				var hexValue = document.createElement('input');
				if(currentValue != undefined) hexValue.value = currentValue;
				hexValue.setAttribute('style','width:90%');
				hexValue.setAttribute('onchange', 'onChangeHexBGColor()');
				hexValue.setAttribute('name','HexBGColor');
				td1.appendChild(hexValue);
				//и chekbox "без цвета"
				var checkbox = document.createElement('input');
				checkbox.setAttribute('type', 'checkbox');
				checkbox.setAttribute('onchange', 'isUseBGColor()');
				checkbox.setAttribute('name','CBBGColor');
				checkbox.setAttribute('style','width:11%');
				if (selectedItemObj.getBGColor() == undefined) checkbox.checked = true;
				td1.appendChild(checkbox);
				td1.appendChild(document.createTextNode('Без цвета'));
			}
			if(property.key == 'BGImage' || property.key == 'SRC'){
				//Добавить onclick для открытия списка изображений или чего-то подобного
				var button = document.createElement('button');
				button.setAttribute('style','width:90%');
				button.setAttribute('onclick','show(true)');
				button.appendChild(document.createTextNode('Выбрать..'));
				td1.appendChild(button);
			}
			return tr;
		}
	}
	
	/*
		Функция, возвращающая текущее значение параметра по пришедшему имени функции для object
	*/
	function getCurrentValue(object, funcName){
		//console.log(funcName);
		switch(funcName){
			case 'getType':
				return object.type;
			case 'getX':
				return coordToBodySize(object.getX());//object.getX();
			case 'getY':
				return coordToBodySize(object.getY());//object.getY();
			case 'getAlign':
				return object.getAlign();
			case 'getWidth':
				return coordToBodySize(object.getWidth());//object.getWidth();
			case 'getHeight':
				return coordToBodySize(object.getHeight());//object.getHeight();
			case 'getBGColor':
				return object.getBGColor();
			case 'getImage':
				return object.getImage();
			case 'getInnerText':
				return object.getInnerText();
			case 'getColorInnerText':
				return object.getColorInnerText();
			case 'getSizeInnerText':
				return object.getSizeInnerText();
			case 'getFontInnerText':
				return object.getFontInnerText();
			case 'getStyleInnerText':
				return object.getStyleInnerText();
			case 'getAlignInnerText':
				return object.getAlignInnerText();
			case 'getBorderWidth':
				return object.getBorderWidth();
			case 'getBorderColor':
				return object.getBorderColor();
			case 'getBorderRadius':
				return object.getBorderRadius();
			case 'isChecked':
				return object.isChecked();
			default:
				return undefined;
		}
	}
	
	/*
		Функция создания стандартных шаблонов
	*/
	function generateTemplate(){
		//Уничтожаем все имеющиеся объекты
		/*for(var i = 0; i < elems.length; i++){
            elems[i].group.destroy();
        }
        elems = [];*/
		//Создаем сетку
		if(gridShow) createCanvasCells();
		//И шаблоны элементов
		new toolBarElement('<div>',"#d6d6d6");
		new toolBarElement('<p>',"red", 40);
		new toolBarElement('<img>','#000000');
		
		new toolBarElement('<input_text>','#ffffff',20);
		new toolBarElement('<input_button>','#e6e6e6',20);
		new toolBarElement('<input_radio>','#000000',20);
		
	}
	
/*
	Область функций-обработчиков изменения свойств объекта
*/	
	/*
		Фукнция обработки нажатия по Font
	*/
	function hideFont(){
        var tr = $("tr[class='hideFont']");
        tr.each(function(){
            var display = $(this).css('display');
            if (display != 'none')$(this).hide();
            else $(this).show();
        });
    }
	function onChangeTextFont(){
		var newFont = window.event.srcElement.value;
		selectedItemObj.setFontInnerText(newFont);
		var fontInput = $('input[class="fontProperties"');
		var oldValue = fontInput[0].value.split(',');
		fontInput[0].value = newFont+', '+oldValue[1];
	}
	
	function onChangeSizeText(){
		var newSize = window.event.srcElement.value;
		selectedItemObj.setSizeInnerText(newSize);
		var fontInput = $('input[class="fontProperties"');
		var oldValue = fontInput[0].value.split(',');
		fontInput[0].value = oldValue[0]+', ' + newSize;
	}
	
	function onChangeColorText(){
		var newColor = window.event.srcElement.value;
		selectedItemObj.setColorInnerText(newColor);
	}
	
	function onChangeStyleText(){
		var newStyle = window.event.srcElement.value;
		selectedItemObj.setStyleInnerText(newStyle);
	}
	
	function onChangeAlignText(){
		var newAlign = window.event.srcElement.value;
		selectedItemObj.setAlignInnerText(newAlign);
	}
	
	function onChangeText(){
        var newText = window.event.srcElement.value;
        selectedItemObj.setInnerText(newText);
    }
	
	function onChangeBorderWidth(){
		var newWidth = parseInt(window.event.srcElement.value);
		if (newWidth < 0 && isNaN(newWidth)){
			window.event.srcElement.value = selectedItemObj.getBorderWidth();
			return;
		}
		selectedItemObj.setBorderWidth(newWidth);
	}
	
	function onChangeBorderColor(){
		var newColor = window.event.srcElement.value;
		selectedItemObj.setBorderColor(newColor);
	}
	
	function onChangeBorderRadius(){
		var newRadius = parseInt(window.event.srcElement.value);
		if (newRadius < 0 && isNaN(newRadius)){
			window.event.srcElement.value = selectedItemObj.getBorderRadius();
			return;
		}
		selectedItemObj.setBorderRadius(newRadius);
	}
	
	function onChangeX(){
		var newX = parseInt(window.event.srcElement.value);
		if(newX < 0 || isNaN(newX)){
			window.event.srcElement.value = selectedItemObj.getX();
			return;
		}
		selectedItemObj.setX(coordToRealValue(newX));
	}
	
	function onChangeY(){
		var newY = parseInt(window.event.srcElement.value);
		if(newY < 0 || isNaN(newY)){
			window.event.srcElement.value = selectedItemObj.getY();
			return;
		}
		selectedItemObj.setY(coordToRealValue(newY));
	}
	
	function onChangeWidth(){
		var newWidth = parseInt(window.event.srcElement.value);
		if(newWidth < 3 * anchorSize || isNaN(newWidth)){
			window.event.srcElement.value = selectedItemObj.getWidth();
			return;
		}
		selectedItemObj.setWidth(coordToRealValue(newWidth));
	}
	
	function onChangeHeight(){
		var newHeight = parseInt(window.event.srcElement.value);
		if(newHeight < 3 * anchorSize || isNaN(newHeight)){
			window.event.srcElement.value = selectedItemObj.getHeight();
			return;
		}
		selectedItemObj.setHeight(coordToRealValue(newHeight));
	}
	
	function onChangeBGColor(){
		var newColor = window.event.srcElement.value;
		selectedItemObj.setBGColor(newColor);
		$("input[name='HexBGColor']")[0].value = newColor;
		$("input[name='CBBGColor']")[0].checked = false;
	}
	
	function onChangeHexBGColor(){
		var newColor = window.event.srcElement.value;
		if(newColor != undefined){
			var inpColor = $("input[name='INPBGColor']")[0];
			//Вставляем значение в input, для получения адекватного цвета
			inpColor.value = newColor;
			//На всякий случай проверяем не введем ли черный цвет
			if(newColor == '#000000'){
				selectedItemObj.setBGColor(newColor);
				$("input[name='CBBGColor']")[0].checked = false;
				return;
			}else{
				//Иначе, если inpColor обратился в черный - значит цвет введен не верно
				if(inpColor.value == "#000000"){
					//Ставим "без цвета"
					selectedItemObj.setBGColor(undefined);
					$("input[name='CBBGColor']")[0].checked = true;
				}else{
					//Иначе цвет введен верно, применяем его
					selectedItemObj.setBGColor(newColor);
					$("input[name='CBBGColor']")[0].checked = false;
				}
			}
		}else{
			selectedItemObj.setBGColor(undefined);
			$("input[name='CBBGColor']")[0].checked = true;
		}
	}
	
	function onChangeImage(){
		var newImageSrc = window.event.srcElement.value;
		if (newImageSrc == '') newImageSrc = undefined;
		selectedItemObj.setImage(newImageSrc);
	}
	
	function isUseBGColor(){
		if (window.event.srcElement.checked) selectedItemObj.setBGColor(undefined);
		else selectedItemObj.setBGColor($("input[name='INPBGColor']")[0].value);
	}
	
	function onChangeAlign(){
		var newAlign = window.event.srcElement.value;
		selectedItemObj.setAlign(newAlign);
	}
	
	function onChangeChecked(){
		var checked = window.event.srcElement.value;
		selectedItemObj.setChecked(checked);
	}
	
/*
	Обработка нажатия кнопок
	Delete Ctrl+C Ctrl+V
*/
	var currentPos = new Object(), onLayer = false;
	$(document).ready(function() {
		var delKeyCode = 46,
			ctrlDown = false,
			ctrlKeyCode = 17,
			vKeyCode = 86,
			cKeyCode = 67;
		$('#center').mousemove(function(e){
			onLayer = true;
			currentPos.x = e.clientX - $('#leftBar').width(); 
			currentPos.y = e.clientY - $('#header').height();
			//console.log(currentPos);
		});
		$('#center').mouseout(function(e){
			onLayer = false;
		});
		$(document).keydown(function(e){
			if (e.keyCode == delKeyCode) deleteObject();
			else if(e.keyCode == ctrlKeyCode) ctrlDown = true;
			else if(ctrlDown && e.keyCode == cKeyCode && onLayer) onCopyObj();
			else if(ctrlDown && e.keyCode == vKeyCode && onLayer) onPasteObj();
		}).keyup(function(e){
			if(e.keyCode == ctrlKeyCode) ctrlDown = false;
		});
	});
	
	/*
		Функция копирования объекта
	*/
	function onCopyObj(){
		if(selectedItem == undefined) return;
		//Копируем объект со всеми свойствами
		copyObject = Object.assign({},selectedItemObj);
	}
	
	/*
		Функция создания копии объекта на рабочей области
	*/
	function onPasteObj(){
		if(copyObject == undefined) return;
		//Убираем выделение
		deselectCurrentItem();
		//Создаем новую копию
		var obj = objectClone(copyObject);
		//Выделяем для работы
		obj.select(true);
		//Кладем группу в координатах курсора
		obj.setX(currentPos.x);
		obj.setY(currentPos.y);
		//Запускаем функцию размещения объекта
		findPlace_Absolute(obj);
		stage.draw();
	}
	
	/*
		Функция клонирования рабочего объекта
	*/
	function objectClone(obj){
		if(obj == undefined) return;
		
		var clone = Object.assign({},obj);
		elemsCount[clone.type]++;
		var name = clone.type + elemsCount[clone.type];
		clone.group = groupClone(obj.group, clone);
		//Копируем все объекты Konva из группы чтобы сбросить ссылки с исходного объекта
		for(p in obj){
			try{
				if(obj[p].getType()!='Layer' && obj[p].getType()!='Group'){
					var t = clone.group.get('.' + obj[p].name())[0];
					clone[p] = t;
				}
			}catch(err){}
		}
		//Даем уникальное имя и помещаем в массив объектов
		clone.setName(name);
		elems.push(clone);
		
		return clone;
	}
	
	/*
		Функция клонирования группы рабочего объекта (рекурсивная с вышестоящей функцией)
			group - группа, которая клонируется
			obj - объект, содержащий данную группу (для рекурсивного алгоритма - указание родителя)
	*/
	function groupClone(group, obj){
		if (group == undefined) return;
		
		var clone = new Konva.Group({
			x: group.x(),
			y: group.y(),
			name: group.name()
		});
		clone.dragBoundFunc(group.dragBoundFunc());
		group.getChildren().forEach(function(item){
			if(item.getType() != 'Group'){
				clone.add(item.clone());
			}else{
				var insertedElem = findElem(item);
				var newElem = objectClone(insertedElem);
				newElem.parentObj = obj;
				clone.add(newElem.group);
			}
		});
		return clone;
	}
/*
	Область функций обработки окна
*/
	$('#gridShowCB').on('change', function(e){
		gridShow = e.currentTarget.checked;
		if(gridShow){
			$($('tr[id="trgu"]')[0]).show();
			var oldValue = gridSize;
			var value = parseInt($("#gridSizeInp")[0].value);
			if(value <= 0) return;
			gridSize = value;
			if(oldValue == gridSize) gridLayer.show();
			else{
				createCanvasCells();
				gridLayer.show();
				stage.draw();
			}
		}else{
			$($('tr[id="trgu"]')[0]).hide();
			gridLayer.hide();
		}
	});
	
	$('#gridSizeInp').on('change', function(e){
		if(gridShow){
			var oldValue = gridSize;
			var value = parseInt($("#gridSizeInp")[0].value);
			if(value <= 0) return;
			gridSize = value;
			if(oldValue == gridSize) gridLayer.show();
			else{
				createCanvasCells();
				gridLayer.show();
				stage.draw();
			}
		}
	});
	
	$('#gridUseCB').on('change', function(e){
		gridUse = e.currentTarget.checked;
	});
	
	$('#borderShowCB').on('change', function(e){;
		borderVisible = e.currentTarget.checked;
		for(var i = 0; i < elems.length; i++){
			elems[i].borderVisible(borderVisible);
		}
		stage.draw();
	});
	
	$('#stretchingCB').on('change', function(e){;
		stretch = e.currentTarget.checked;
		if (stretch) $($('tr[id="bodyWidth"]')[0]).hide();
		else $($('tr[id="bodyWidth"]')[0]).show();
	});
	
	$('#bodySize').on('change', function(e){;
		var value = e.currentTarget.value;
		if(value < 300 || value > 10000){
			e.currentTarget.value = bodySize;
			return;
		}
		bodySize = value;
	});
	
/*
	Функции по работе с popup контентом (выбор картинки)
*/
	function fillImageDiv(){
		var imageDiv = document.getElementById('popup-content');
		imageDiv.innerHTML = '';
		
		var width = parseInt(stageWidth / 2);
		var imageWidth = 150;
		$(imageDiv).width(width);
		var countInRow = parseInt(width / imageWidth),
			count = 1;
		var table = document.createElement('table');
		table.setAttribute('align','center');
		var tr = document.createElement('tr');
		for(var i = 0; i < imgs.length; i++){
			if(count > countInRow){
				table.appendChild(tr);
				tr = document.createElement('tr');
				count = 1;
			}
			var td = document.createElement('td');
			var img = createImg(imgs[i]);
			if (img == undefined) continue;
			td.appendChild(img);
			//td.appendChild(createImg(imgs[i]));
			tr.appendChild(td);
			count++;
		}
		if(count != 0) table.appendChild(tr);
		imageDiv.appendChild(table);
	}
	function createImg(imgInfo){
		var img = document.createElement('img');
		img.setAttribute('src',imgInfo);
		img.setAttribute('id','img');
		
		if (!existImg(imgInfo)) return undefined;
		
		img.setAttribute('width',150);
		img.setAttribute('height',130);
		img.setAttribute('style','margin:5px');
		img.setAttribute('onclick','c('+'"'+imgInfo+'"'+')');
		return img;
	}
	
	function existImg(img){
		var i = new Image();
		i.src = img;
		return i.height != 0;
	}
	
	function c(imgSrc){
		if(selectedItemObj == undefined) return;
		selectedItemObj.setImage(imgSrc);
		propertiesDisplay();
	}
	
	function show(state){
		var imageDiv = $($('.popup')[0]);
		if(state) imageDiv.show();
		else imageDiv.hide();
	}
/*
	----------------------------------------------------
*/
	
	function coordToBodySize(coord){
		var koef = stretch ? 1 : bodySize / stageWidth;
		return Math.round(coord * koef);//parseInt(coord * koef);//Math.round(coord * koef);
	}
	
	function coordToRealValue(coord){
		var koef = stretch ? 1 : stageWidth / bodySize;
		return Math.round(coord * koef);//parseInt(coord * koef);//Math.round(coord * koef);
	}
	
	/*
		Функция перерисовки элементов при изменении размера окна
	*/
	window.onresize = function(event) {
		var oldStageWidth = stageWidth,
			oldStageHeight = stageHeight;
		//Получаем новые размеры и применяем их
		stageWidth =  document.getElementById('center').offsetWidth;
		stageHeight = document.getElementById('center').offsetHeight;
		stage.width(stageWidth);
		stage.height(stageHeight);
		
		toolbarWidth = document.getElementById('leftBar').offsetWidth;
		toolbarHeight = document.getElementById('leftBar').offsetHeight;
		toolbar.width(toolbarWidth);
		toolbar.height(toolbarHeight);
		//Отрисовываем новую сетку
		createCanvasCells();
		//Меняем размер у элементов toolbar
		for(var i = 0; i < toolbarElementsCount; i++){
			elems[i].setX(parseInt(toolbarWidth / 6));
			elems[i].setWidth(parseInt(toolbarWidth - 2 * (toolbarWidth / 6)));
		}
		//Если есть элементы в рабочей области
		if(elems.length > toolbarElementsCount){
			var koef = stageWidth / oldStageWidth;
			//Меняем размер у элементов в рабочей области
			for(var i = toolbarElementsCount; i < elems.length; i++){
				elems[i].setX(parseInt(elems[i].getX() * koef));
				elems[i].setWidth(parseInt(elems[i].getWidth() * koef));
			}
		}
		fillImageDiv();
	};
	
	/*
		Функция увеличения высоты документа
	*/
	function checkCanvasHeight(pos){
		if (stageHeight - pos < gridSize + 10){
			stageHeight+=100;
			stage.height(stageHeight);
			createCanvasCells();
		}
	}
	
/*
	Функции для общения с сервером
*/	
	/*
		Функция запаковывания JSON-представления HTML-страницы
	*/
	function createJSONArray(){
		var jsonArray = [];
		//Создаем объект c параметрами body
		var obj = new Object();
		obj.name = 'body';
		if(stretch) obj.stretch = true;
		else obj.bodySize = bodySize;
		jsonArray.push(obj);
		//Переносим текущий объект на основной слой
		deselectCurrentItem();
		//Получаем объекты на рабочем слое, кроме тех, которые уже лежат в других объектах
		var objects = mainLayer.getChildren();
		//И добавляем его представление в JSON в наш массив
		for (var i = 0; i < objects.length; i++){
			jsonArray.push(createJSON(findElem(objects[i])));
		}
		return jsonArray;
	}
	
	
	/*
		Функция запаковывания JSON-представления HTML-объекта
	*/
	function createJSON(object){
		var obj = new Object();
		//Массив атрибутов объекта
		var attr = [];
		//Получаем имя объекта и его тип, если он есть
		var nameObj = String(object.type).substring(1,String(object.type).length - 1).split('_');
		obj.name = nameObj[0];
		if(nameObj.length > 1){
			obj.type = nameObj[1];
		}
		//Собираем значения свойств объекта
		for(var i = 1; i < object.properties.length; i++){
			attr = attr.concat(pObj(object,object.properties[i]));
		}
		obj.attributes = Array.from(attr);
		//Находим все вложенные объекты
		var children = object.group.getChildren(function(node){
			return node.getType() == 'Group';
		});
		var tags = [];
		if (children != undefined){
			for (var i = 0; i < children.length; i++){
				tags.push(createJSON(findElem(children[i])));
			}
		}
		obj.tags = tags;
		
		return obj;
	}
	
	
	function pObj(object,property){
		if (property.childProperties.length > 0){
			var arr = [];
			for(var i = 0; i < property.childProperties.length; i++){
				arr = arr.concat(pObj(object, property.childProperties[i]));
			}
			return arr;
		}else{
			var obj = new Object();
			switch(property.key){
				/*
				case 'Left':
					tempObj.key = 'left';
					break;
				case 'Top':
					tempObj.key = 'top';
					break;
				case 'Align':
					tempObj.key = 'align';
					break;
				case 'Width':
					tempObj.key = 'width';
					break;
				case 'Height':
					break;
				case 'Checked':
					break;
				case 'SRC':
					break;
				*/
				case 'Text':
					if(object.type == '<input_text>') obj.key = 'value';
					else obj.key = 'text';
					break;
				case 'BGColor':
					obj.key = 'background-color';
					break;
				case 'BGImage':
					obj.key = 'background-image';
					break;
				case 'TextFont':
					obj.key = 'font-family';
					break;
				case 'TextSize':
					obj.key = 'font-size';
					break;
				case 'TextColor':
					obj.key = 'color';
					break;
				case 'TextStyle':
					obj.key = 'font-style';
					break;
				case 'TextAlign':
					obj.key = 'text-align';
					break;
				case 'BorderWidth':
					obj.key = 'border-width';
					break;
				case 'BorderColor':
					obj.key = 'border-color';
					break;
				case 'BorderRadius':
					obj.key = 'border-radius';
				default:
					obj.key = property.key.toLowerCase();
			}
			obj.value = getCurrentValue(object,property.funcName);
			var defaultValue = [undefined,'left','none','normal'];
			if (defaultValue.includes(obj.value)) return [];
			else return obj;
		}
	}
	
	/*
		Функция распаковки 
	*/
	function parseJSON(json){
		var parsed = [];
		json = JSON.parse(json);
		//Первый элемент - body
		if (json[0].stretch != undefined){
			stretch = true;
			$($('#stretchingCB')[0]).checked = true;
		}else {
			$($('#stretchingCB')[0]).checked = false;
			bodySize = parseInt(json[0].bodySize);
		}
		//Внешний вид
		if (stretch) $($('tr[id="bodyWidth"]')[0]).hide();
		else $($('tr[id="bodyWidth"]')[0]).show();
		//Убираем выделение
		deselectCurrentItem();
		//Удаляем из массива
		elems.splice(toolbarElementsCount, elems.length - toolbarElementsCount);
		//И с рабочего слоя
		mainLayer.destroyChildren();
		mainLayer.draw();
		//А теперь создаем элементы из json
		for(var i = 1; i < json.length; i++){
			createElem(json[i]);
		}
		deselectCurrentItem();
	}
	
	function createElem(jsonInfo, parentObj){
		deselectCurrentItem();
		var name = jsonInfo.name;
		if(jsonInfo.type != undefined) name = '<' + name + '_' + jsonInfo.type + '>';
		else name = '<' + name + '>';
		//console.log(name);
		//Находим элемент, если он есть
		for(var i = 0; i < toolbarElementsCount; i++){
			if (name == elems[i].type){
				//Клонируем объект
				var clone = cloneToolbarElement(elems[i].group);
				moveToMainLayer(clone.group);
				//Если объект содержится в другом объекте - выставляем ему родителя
				if(parentObj != undefined){
					selectedItemObj.parentObj = parentObj;
					selectedItemObj.group.moveTo(parentObj.group);
					//parentObj.updateSize();
				}
				//Выставляем свойства
				var attr = jsonInfo.attributes;
				if(attr != undefined){
					for(var a = 0; a < attr.length; a++){
						try{
						switch(attr[a].key){
							case 'left':
								selectedItemObj.setX(parseInt(attr[a].value));
								break;
							case 'top':
								selectedItemObj.setY(parseInt(attr[a].value));
								break;
							case 'align':
								selectedItemObj.setAlign(attr[a].value);
								break;
							case 'width':
								selectedItemObj.setWidth(parseInt(attr[a].value));
								break;
							case 'height':
								selectedItemObj.setHeight(parseInt(attr[a].value));
								break;
							case 'checked':
								selectedItemObj.setChecked(attr[a].value);
								break;
							case 'text':
								selectedItemObj.setInnerText(attr[a].value);
								break;
							case 'value':
								if (name == '<input_text>') selectedItemObj.setInnerText(attr[a].value);
								else console.log('parse json attr "'+attr[a].key + '" from ' + name);
								break;
							case 'background-color':
								selectedItemObj.setBGColor(attr[a].value);
								break;
							case 'src':
							case 'background-image':
								selectedItemObj.setImage(attr[a].value);
								break;
							case 'font-family':
								selectedItemObj.setFontInnerText(attr[a].value);
								break;
							case 'font-size':
								selectedItemObj.setSizeInnerText(parseInt(attr[a].value));
								break;
							case 'color':
								selectedItemObj.setColorInnerText(attr[a].value);
								break;
							case 'font-style':
								selectedItemObj.setStyleInnerText(attr[a].value);
								break;
							case 'text-align':
								selectedItemObj.setAlignInnerText(attr[a].value);
								break;
							case 'border-width':
								selectedItemObj.setBorderWidth(parseInt(attr[a].value));
								break;
							case 'border-color':
								selectedItemObj.setBorderColor(attr[a].value);
								break;
							default:
								console.log('not supported attr "'+attr[a].key+'"');
						}
						}catch(ex){
							console.log('err in set attr "' + attr[a].key + '" with value: "'+attr[a].value +'" on object.type: "'+selectedItemObj.type+'"');
						}
					}
				}
				if(parentObj != undefined) parentObj.updateSize();
				
				if(jsonInfo.tags != undefined){
					var tags = jsonInfo.tags;
					for(var t = 0; t < tags.length; t++){
						createElem(tags[t],selectedItemObj);
					}
				}
				//Выходим
				break;
			}
		}
	}
	
	/*
		Функция получения ссылок на картинки от сервера и заполнение ими массива
	*/
	function getImage(){
		imgs.push('https://pp.userapi.com/c636728/v636728764/55555/_Roua36t_6U.jpg');
		imgs.push('https://pp.userapi.com/c637216/v637216441/50f84/lCaA8wCa7pk.jpg');
		imgs.push('https://pp.userapi.com/c637830/v637830742/4251b/JVCQo5CSrzk.jpg');
		imgs.push('https://pp.userapi.com/c637216/v637216441/50f97/MmPSo-CYGX8.jpg');
		imgs.push('https://pp.userapi.com/c637216/v637216441/50f9e/-zZEnfPYRWI.jpg');
		imgs.push('https://pp.userapi.com/c637216/v637216441/50fa5/iavnFC2XazM.jpg');
		imgs.push('https://pp.userapi.com/c638523/v638523934/3fa7b/HmqVqFOZUuY.jpg');
	}
	/*
		Функция отправки запроса на генерацию 
	*/
	$('#genHtml').on('click', function (e) {
		var data = JSON.stringify(createJSONArray());
        //console.log(data);
        $.ajax({
            type: "POST",
            url: "/Main/generateHTML",
            data: {JSONData: data},
            success: function(response, status, xhr) {
                // check for a filename
                var filename = "";
                var disposition = xhr.getResponseHeader('Content-Disposition');
                if (disposition && disposition.indexOf('attachment') !== -1) {
                    var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    var matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
                }
                var type = xhr.getResponseHeader('Content-Type');
                var blob = new Blob([response], { type: type });
                if (typeof window.navigator.msSaveBlob !== 'undefined') {
                    // IE workaround for "HTML7007: One or more blob URLs were revoked by closing the blob for which they were created. These URLs will no longer resolve as the data backing the URL has been freed."
                    window.navigator.msSaveBlob(blob, filename);
                } else {
                    var URL = window.URL || window.webkitURL;
                    var downloadUrl = URL.createObjectURL(blob);

                    if (filename) {
                        // use HTML5 a[download] attribute to specify filename
                        var a = document.createElement("a");
                        // safari doesn't support this yet
                        if (typeof a.download === 'undefined') {
                            window.location = downloadUrl;
                        } else {
                            a.href = downloadUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                        }
                    } else {
                        window.location = downloadUrl;
                    }
                    setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 100); // cleanup
                }
            }
        });
	});
	
	/*
		Функция отправки запроса на реверс-инжиниринг
	*/
	$('#openHtml').on('click', function (e) {
		//parseJSON('[{"name":"body","bodySize":1000},{"name":"div","attributes":[{"key":"left","value":205},{"key":"top","value":22},{"key":"width","value":655},{"key":"height","value":159}],"tags":[]},{"name":"div","attributes":[{"key":"left","value":454},{"key":"top","value":298},{"key":"width","value":142},{"key":"height","value":60}],"tags":[{"name":"input", "type":"text", "attributes":[{"key":"left","value":0},{"key":"top","value":36},{"key":"width","value":142},{"key":"height","value":17},{"key":"border-color","value":"black"},{"key":"background-color","value":"#ffffff"},{"key":"value","value":""},{"key":"font-family","value":"Calibri"},{"key":"font-size","value":14},{"key":"color","value":"black"}],"tags":[]}]}]');
		e.preventDefault();
        var files = document.getElementById('uploadFile').files;
        if (files.length > 0) {
            if (window.FormData !== undefined) {
                var data = new FormData();
                for (var x = 0; x < files.length; x++) {
                    data.append("file" + x, files[x]);
                }
 
                $.ajax({
                    type: "POST",
                    url: '/Main/generateProject',
                    contentType: false,
                    processData: false,
                    data: data,
                    success: function (result) {
                        //generateTemplate();
                        parseJSON(result);
                    },
                    error: function (xhr, status, p3) {
                        alert(xhr.responseText);
                    }
                });
            } else {
                alert("Браузер не поддерживает загрузку файлов HTML5!");
            }
        }
	});
/*
	Область кода, выполняемого при старте
*/
	generateTemplate();
	getImage();
	fillImageDiv();