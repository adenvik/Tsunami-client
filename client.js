/*
	Область общих переменных
*/
	var selectedItem,
		selectedItemObj,
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
		elems=[];
		
	var gridUse = true,
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
		
	/*function initialize(){
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
	}*/
	
/*
	Область функций обработчиков на слоях
*/
	/*
		Функция создания сетки
	*/
	function createCanvasCells() {
		for (var i = 0; i < stageHeight / gridSize; i++) {
			var line = new Konva.Line({
				points: [0, i * gridSize, stageWidth, i * gridSize],
				stroke: 'black',
				strokeWidth: 0.2
			});
			gridLayer.add(line);
		}
		for (var i = 0; i < stageWidth / gridSize; i++) {
			var line = new Konva.Line({
				points: [i * gridSize, 0, i * gridSize, stageHeight],
				stroke: 'black',
				strokeWidth: 0.2
			});
			gridLayer.add(line);
		}
		gridLayer.draw();
	}

	//Панель инструментов----------------------------------------------------------------------------------
	toolbar.on('mousedown', function(evt) {
		deselectCurrentItem();
		//Получаем текущую фигуру
		var shape = evt.target.getParent();
		//Копируем ее объект
		var clone = cloneToolbarElement(shape);
		//Включаем возможность "движения"
		clone.group.startDrag();
	});
	toolbar.on('mouseup', function(evt) {
		//Получаем выбранную фигуру
		var shape = evt.target.getParent();
		//Удаляем фигуру
		shape.destroy();
		//Удаляем элемент из списка
		elems.pop();
		selectedItem = undefined;
		selectedItemObj = undefined;
		toolbarLayer.draw();
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
	stage.on('mouseup', function(evt){
		//Находим пересечение на основном слое
		//var target = mainLayer.getIntersection(selectedItem.getAbsolutePosition(),'Group');
		//findPlace(selectedItemObj, target);
		findPlace_Absolute(selectedItemObj);
		stage.draw();
	});
	stage.on('dragend', function(evt){
		propertiesDisplay();
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
		}
		switch(target){
			case undefined || null:
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
				//По группе находим элемент
				target = findElem(target);
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
		Функция определения куда поместить объект
			current - выбранный объект
			target - объект, в который помещаем current
	*/
	/*function findPlace(current, target){
		console.log('find:');
		console.log(current);
		if (target != undefined) console.log(findElem(target));
		else console.log(target);
		//Если помещать некуда - помещаем в dragLayer
		if (target == undefined){
			current.parentObj = undefined;
			current.group.position(current.getAbsolutePosition());
			current.setLayer(dragLayer);
			return;
		}
		target = findElem(target);
		//Если словили сами себя - выходим
		if (target == current) return;
		var x,
			y,
			flag = false;
		//Проверяем не находится ли current справа от target
		if (current.getAbsolutePosition().x == target.getAbsolutePosition().x + target.getWidth() &&
			current.getAbsolutePosition().y >= target.getAbsolutePosition().y &&
			current.getAbsolutePosition().y <= target.getAbsolutePosition().y + target.getHeight())
		{
			console.log('right');
			x = target.getAbsolutePosition().x + target.getWidth();
			y = current.getAbsolutePosition().y;
			flag = true;
		}
		//Проверяем не находится ли current снизу от target
		if (current.getAbsolutePosition().y == target.getAbsolutePosition().y + target.getHeight() &&
			current.getAbsolutePosition().x >= target.getAbsolutePosition().x &&
			current.getAbsolutePosition().x <= target.getAbsolutePosition().x + target.getWidth())
		{
			console.log('bot');
			//На всякий случай, если объект уже смещен - больше не трогаем,а то будет уходить в правый нижний угол
			if(!flag){
				x = current.getAbsolutePosition().x;
				y = target.getAbsolutePosition().y + target.getHeight();
				flag = true;
			}
		}
		if (!flag){
			//Проверяем может ли объект содержать другие объекты
			if (target.type == '<div>'){
				current.setX(current.getAbsolutePosition().x - target.getAbsolutePosition().x);
				current.setY(current.getAbsolutePosition().y - target.getAbsolutePosition().y);
				current.parentObj = target;
				current.group.moveTo(target.group);
				target.updateSize();
				console.log('положил');
				return;
			}else{
				//Тогда помещаем объект ниже target
				x = current.getAbsolutePosition().x;
				y = target.getAbsolutePosition().y + target.getHeight();
			}
		}
		//Теперь проверяем нет ли родителя у target, т.к. если объект не был помещен внутрь target, то он лежит в target.parentObj
		if (target.parentObj != undefined){
			current.setX(x - target.parentObj.getAbsolutePosition().x);
			current.setY(y - target.parentObj.getAbsolutePosition().y);
			current.parentObj = target.parentObj;
			current.group.moveTo(target.parentObj.group);
			target.parentObj.updateSize();
		}else{
			current.setX(x);
			current.setY(y);
			current.parentObj = undefined;
			current.setLayer(dragLayer);
		}
		//Проверяем новую позицию
		//target = mainLayer.getIntersection(current.getAbsolutePosition(),'Group');
		//console.log('find targer:');
		//console.log(target);
		//console.log('---------');
		//if(target != undefined) findPlace(current, target);
	}*/

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
			x: toolbarWidth / 6,
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
				if(position.x > this.getStage().width()){
					moveToMainLayer(this);
				}
				else{
					if (x < 0) x = 0;
					if (y < 0) y = 0;
					if (y > toolbarHeight - rect.height()) y = toolbarHeight - rect.height();
				}
			} else {
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
				x:x,
				y:y
			}
		});
		this.rect = new Konva.Rect({
			x: 0,
			y: 0,
			width: toolbarWidth - 2 * (toolbarWidth / 6), 
			height: height,
			fill: this.color,
			name: this.name+'rect',
			strokeWidth:0.5,
			stroke: 'black'
		});
		this.group.add(this.rect);
		this.groupTypeText = new Konva.Text({
			x: 12,
			y: -15,
			text: this.type,
			name: this.name+'type',
			fontSize: 14,
			fontFamily: 'Calibri',
			fill: '#000000',
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
			this.layer.draw();
		}
		this.getHeight = function(){
			return this.rect.height();
		}
		this.setHeight = function(value){
			this.rect.height(value);
			this.layer.draw();
		}
		this.getX = function(){
			return this.group.getX();
		}
		this.setX = function(value){
			this.group.setX(value);
			this.layer.draw();
		}
		this.getY = function(){
			return this.group.getY();
		}
		this.setY = function(value){
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
			if(value) this.rect.stroke('#000000');
			else this.rect.stroke(undefined);
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
		//Помечаем текущий элемент
		selectedItem = clone.group;
		selectedItemObj = clone;
		return clone;
	}
	
	/*
		Функция поиска объекта, соответсвующего полученному графическому объекту
	*/
	function findElem(group){
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
		//console.log(object);
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
			this.rect.width(value);
			this.selectionRect.width(value);
			//Обновляем положение якорей справа
			this.group.get('.' + this.name + 'topRight')[0].setX(value - anchorSize);
			this.group.get('.' + this.name + 'bottomRight')[0].setX(value - anchorSize);
			//this.layer.draw();
			this.draw();
		}
		object.setHeight = function(value){
			this.rect.height(value);
			this.selectionRect.height(value);
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
			if (this.parentObj != undefined) this.parentObj.updateSize();
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
		/*function createHtmlObject(name,type,func){
			var htmlObj = new Object();
			htmlObj.name = name; htmlObj.type = type; htmlObj.func = func;
			return htmlObj;
		}*/
		object.addProperty('Type','getType',createHtmlObject('input','text'));
		object.addProperty('Left','getX',createHtmlObject('input','text','onChangeX'));
		object.addProperty('Top','getY',createHtmlObject('input','text','onChangeY'));
		object.addProperty('Width','getWidth',createHtmlObject('input','text','onChangeWidth'));
		object.addProperty('Height','getHeight',createHtmlObject('input','text','onChangeHeight'));
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
				object.imageObj = new Konva.Image({
					x: 0,
					y: 0,
					image:undefined,
					name:object.name+'image',
					width:object.getWidth(),
					height:object.getHeight()
				});	
				object.group.add(object.imageObj);
				object.setImage = function(value){
					this.rect.fill(undefined);
					//Если ссылка пуста - стираем картинку
					if (value == undefined){
						this.imageObj.image(undefined);
						this.draw();
						return;
					}
					//Иначе создаем переменную
					var newImage = new Image();
					newImage.src = value;
					//Загружаем картинку и по мере загрузки прорисовываем
					newImage.onload = function(){
						//object.layer.draw();
						object.draw();
					}
					//и добавляем в наш объект
					this.imageObj.image(newImage);
					this.showAnchors();
				}
				object.getImage = function(){
					return this.imageObj.image();
				}
				object.updateSize = function(_super){
					return function(){
						this.imageObj.width(this.getWidth());
						this.imageObj.height(this.getHeight());
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.addProperty('BGImage','getImage()',createHtmlObject('input','text','onChangeImage'));
				break;
			case '<p>':
				object.innerText = new Konva.Text({
					x: anchorSize,
					y: anchorSize,
					text: 'Simple text',
					name: object.name+'text',
					width: object.getWidth(),
					height: object.getHeight(),
					fontSize: 14,
					fontFamily: 'Calibri',
					fill: 'black'
				});
				object.group.add(object.innerText);	
				object.setInnerText = function(value){
					this.innerText.text(value);
					this.draw();
				}
				object.setColorInnerText = function(value){
					this.innerText.fill(value);
					this.draw();
				}
				object.setSizeInnerText = function(value){
					this.innerText.fontSize(value);
					this.innerText.width(this.getWidth());
					this.innerText.height(this.getHeight());
					this.draw();
				}
				object.setFontInnerText = function(value){
					this.innerText.fontFamily(value);
					this.draw();
				}
				object.setStyleInnerText = function(value){
					if (value == 'normal' || value == 'bold' || value == 'italic'){
						this.innerText.fontStyle(value);
					} else this.innerText.fontStyle('normal');
					this.draw();
				}
				object.setAlignInnerText = function(value){
					if (value == 'left' || value == 'center' || value == 'right'){
						this.innerText.align(value);
					} else this.innerText.align('left');
					this.draw();
				}
				object.getInnerText = function(){
					return this.innerText.text();
				}
				object.getColorInnerText = function(){
					return this.innerText.fill();
				}
				object.getSizeInnerText = function(){
					return this.innerText.fontSize();
				}
				object.getFontInnerText = function(){
					return this.innerText.fontFamily();
				}
				object.getStyleInnerText = function(){
					return this.innerText.fontStyle();
				}
				object.getAlignInnerText = function(){
					return this.innerText.align();
				}
				//А теперь делаем магию js - расширяем функцию 
				object.updateSize = function(_super){
					return function(){
						this.innerText.width(this.getWidth() - anchorSize);
						this.innerText.height(this.getHeight() - anchorSize);
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				object.updateSize();
				object.addProperty('Text','getInnerText',createHtmlObject('textarea',undefined,'onChangeText'));
				//specific-----------------------------------
				var htmlElement = createHtmlObject('input','text');
				htmlElement.setAttribute('class','fontProperties')
				object.addProperty('Font',undefined,htmlElement);
				//-------------------------------------------
				object.addProperty('TextFont','getFontInnerText',createHtmlObject('input','text','onChangeTextFont'),'Font');
				object.addProperty('TextSize','getSizeInnerText',createHtmlObject('input','text','onChangeSizeText'),'Font');
				object.addProperty('TextColor','getColorInnerText',createHtmlObject('input','color','onChangeColorText'),'Font');
				object.addProperty('TextStyle','getStyleInnerText',createHtmlObject('input','text','onChangeStyleText'),'Font');
				//object.addProperty('TextAlign','getAlignInnerText',createHtmlObject('input','text','onChangeAlignText'),'Font');
				object.addProperty('TextAlign','getAlignInnerText',createHtmlObject('select',undefined,'onChangeAlignText',['left','center','right']),'Font');
				break;
			case '<input_text>':
				break;
			case '<button>':
				break;
			case '<image>':
				//Удаляем не нужные параметры
				delete object.setBGColor;
				delete object.getBGColor;
				object.rect.fill(undefined);
				//Добавляем контейнер для отображения изображения
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
					return this.imageObj.image.src;
				}
				//Переопределяем функцию изменения размера для изменения размеров картинки
				object.updateSize = function(_super){
					return function(){
						this.imageObj.width(this.getWidth());
						this.imageObj.height(this.getHeight());
						return _super.apply(this,arguments);
					}
				}(object.updateSize);
				//Картинка по умолчанию
				var url = 'https://pp.userapi.com/c636728/v636728764/55555/_Roua36t_6U.jpg';//'https://pp.vk.me/c636328/v636328764/39540/dgYpGwB2zu4.jpg';
				object.setImage(url);
				object.removeProperty('BGColor');
				object.addProperty('SRC','getImage()',createHtmlObject('input','text','onChangeImage'));
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
		propertiesDisplay();
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
					input.setAttribute('value', object.getFontInnerText()+', '+object.getSizeInnerText());
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
				if (selectedItemObj.getBGColor() == undefined) checkbox.checked = true;
				td1.appendChild(checkbox);
				td1.appendChild(document.createTextNode('Без цвета'));
			}
			if(property.key == 'BGImage'){
				//Добавить onclick для открытия списка изображений или чего-то подобного
				var button = document.createElement('button');
				button.setAttribute('style','width:90%');
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
		switch(funcName){
			case 'getType':
				return object.type;
			case 'getX':
				return object.getX();
			case 'getY':
				return object.getY();
			case 'getWidth':
				return object.getWidth();
			case 'getHeight':
				return object.getHeight();
			case 'getBGColor':
				return object.getBGColor();
			case 'getBGImage':
				return object.getBGImage();
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
			default:
				return undefined;
		}
	}
	
	/*
		Функция создания стандартных шаблонов
	*/
	function generateTemplate(){
		//Уничтожаем все имеющиеся объекты
		for(var i = 0; i < elems.length; i++){
            elems[i].group.destroy();
        }
        elems = [];
		//Создаем сетку
		/*if(gridUse)*/ createCanvasCells();
		//И шаблоны элементов
		new toolBarElement('<div>',"#d6d6d6");
		new toolBarElement('<p>',"red", 40);
		new toolBarElement('<image>','#000000');
		
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
	
	function onChangeX(){
		var newX = window.event.srcElement.value;
		selectedItemObj.setX(newX);
	}
	
	function onChangeY(){
		var newY = window.event.srcElement.value;
		selectedItemObj.setY(newY);
	}
	
	function onChangeWidth(){
		var newWidth = window.event.srcElement.value;
		selectedItemObj.setWidth(newWidth);
	}
	
	function onChangeHeight(){
		var newHeight = window.event.srcElement.value;
		selectedItemObj.setHeight(newHeight);
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
			//selectedItemObj.setBGColor(newColor);
			//$("input[name='INPBGColor']")[0].value = newColor;
			//$("input[name='CBBGColor']")[0].checked = false;
		}else{
			selectedItemObj.setBGColor(undefined);
			$("input[name='CBBGColor']")[0].checked = true;
		}
	}
	
	function onChangeImage(){
		var newImageSrc = window.event.srcElement.value;
		selectedItemObj.setImage(newImageSrc);
	}
	
	function isUseBGColor(){
		if (window.event.srcElement.checked) selectedItemObj.setBGColor(undefined);
		else selectedItemObj.setBGColor($("input[name='INPBGColor']")[0].value);
	}
	
/*
	Обработка нажатия кнопок
	Delete Ctrl+C Ctrl+V
*/
	$(document).ready(function() {
		var delKeyCode = 46,
			ctrlDown = false,
			ctrlKeyCode = 17,
			vKeyCode = 86,
			cKeyCode = 67;
		$(document).keydown(function(e){
			if (e.keyCode == delKeyCode) deleteObject();
			else if(e.keyCode == ctrlKeyCode) ctrlDown = true;
			else if(ctrlDown && e.keyCode == cKeyCode) onCopyObj();
			else if(ctrlDown && e.keyCode == vKeyCode) onPasteObj();
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
		//console.log(copyObject);
	}
	
	/*
		Функция создания копии объекта на рабочей области
			!!!!!!!!!!необходимо дополнить размещением!!!!!!!!
	*/
	function onPasteObj(){
		//Убираем выделение
		deselectCurrentItem();
		//Создаем новую копию
		var obj = Object.assign({},copyObject);
		//Копируем группу
		obj.group=copyObject.group.clone();
		
		//Проверяем, нет ли внутри группы, других групп - объектов
		//Если есть - необходимо их "скопировать" согласно алгоритму
		
		//Копируем все объекты Konva из группы чтобы сбросить ссылки с исходного объекта
		for(p in copyObject){
			try{
				if(copyObject[p].getType()!='Layer' && copyObject[p].getType()!='Group'){
					var t = obj.group.get('.' + copyObject[p].name())[0];
					obj[p] = t;
				}
			}catch(err){}
		}
		//console.log(obj);
		elemsCount[obj.type]++;
		var name = obj.type + elemsCount[obj.type];
		//Даем уникальное имя и помещаем в массив объектов
		obj.setName(name);
		elems.push(obj);
		//Выделяем для работы
		obj.select(true);
		//ВОТ СЮДА ВСТАВИТЬ РАЗМЕЩЕНИЕ, а пока что так
		obj.setX(0);
		obj.setY(0);
	}
/*
	Область функций обработки окна
*/
	$('#genHtml').on('click', function (e) {
		alert("NO");
	});
	/*
		Функция перерисовки элементов при изменении размера окна
	*/
	window.onresize = function(event) {
		//console.log('resize');
		var tempElems = elems;
		elems = [];
		toolbarElementsCount = 0;
		initialize();
		generateTemplate();
		/*for(var i = toolbarElementsCount; i < tempElems.length; i++){
			var elem = tempElems[i];
			//масштабируем его как-то
			//Добавляем в наш массив
			elems.push(elem);
			//Отрисовываем
			stage.draw();
		}*/
		location.reload();
		/*$.ajax({
			success: function() {   
				location.reload();  
			}
		});*/
	};
/*
	Область кода, выполняемого при старте
*/
	//initialize();
	generateTemplate();