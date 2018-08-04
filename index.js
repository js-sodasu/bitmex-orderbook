var app = new Vue({
	el: '#app',
	data(){
		return {
			bid:null,
			ask:null,
			lastPrice:0,
			lastPriceSide:'',
			subscribe:{
				orderBookL2: false,
				instrument: false
			},
			isReady:false,
			order:{},
			orderBook:{},
			orderSell:{},
			orderBuy:{},
			orderListLine:20,
			orderGroup:1,
			orderGroupRangeList:[0.5,1,2.5,5,10,25,50,100],
			orderGroupRange:1,
			orderGroupAlaram:{
				'0.5':[1000000,10000000],
				'1':[1000000,10000000],
				'2':[1000000,10000000],
				'2.5':[2000000,10000000],
				'5':[3000000,10000000],
				'10':[5000000,10000000],
				'25':[10000000,20000000],
				'50':[20000000,30000000],
				'100':[30000000,50000000]
			},
			socket: new WebSocket('wss://www.bitmex.com/realtime')
		}
	},
	watch:{
		orderGroupRange:function(val){
			this.orderGroup = this.orderGroupRangeList[val]
		},
		orderListLine:function(val){
			
		},
		isReady:function(val){
			if(val===true)
				isReady = true

		}
	},
	computed:{
		lastPriceClass:function(){
			return{
				'long':this.lastPriceSide=='Buy',
				'short':this.lastPriceSide=='Sell'
			}
		},
		orderSell:function(){

		},
		orderBuy:function(){

		},

	},
	methods:{
		drawOrderBook: _.debounce(
			function(){
			if(!this.subscribe.orderbookL2||!this.subscribe.instrument)
				return



			var lastPrice = this.lastPrice

			var startBuyPrice = this.bid
			var startSellPrice = this.ask

			var gapPrice = this.orderGroup

			var showMaximum = this.orderListLine

			var startBuyViewPrice = Math.floor(startBuyPrice/gapPrice)*gapPrice
			var startSellViewPrice = Math.ceil(startSellPrice/gapPrice)*gapPrice

			var tmpOrder = {
				price:null,
				size:null,
				total:null,
				scale:''
			}

			var totalBuy = 0
			var totalSell = 0

			var currentBuyViewPrice = startBuyViewPrice
			var currentSellViewPrice = startSellViewPrice

			var buyOrderList = []
			var sellOrderList = []

			var cntShow = 0
			for(var price = startBuyPrice;;price -= 0.5)
			{
				var tmpViewPrice = currentBuyViewPrice
				if(this.orderBook[price]==undefined)
					continue
				var tmpSize = this.orderBook[price].size;

				if(currentBuyViewPrice>price)
				{
					currentBuyViewPrice -= gapPrice

					if(tmpOrder['size']>this.orderGroupAlaram[gapPrice][0])
						tmpOrder['scale'] = 'wow'

					if(tmpOrder['size']>this.orderGroupAlaram[gapPrice][1])
						tmpOrder['scale'] = 'awwwwwwww'

					tmpOrder['total'] = new Intl.NumberFormat('en-US').format(totalBuy)
					tmpOrder['size'] = new Intl.NumberFormat('en-US').format(tmpOrder['size'])
					tmpOrder['price'] = new Intl.NumberFormat('en-US').format(tmpOrder['price'])
					if(tmpOrder['price'].indexOf('.')==-1)
						tmpOrder['price'] += '.0'

					buyOrderList.push(tmpOrder)

					tmpOrder = {
						price:null,
						size:null,
						total:null
					}
					cntShow += 1
				}

				totalBuy += tmpSize
	
				if(tmpOrder['price']==null)
				{
					tmpOrder['price'] = currentBuyViewPrice
					tmpOrder['size'] = tmpSize
				}
				else
				{
					tmpOrder['size'] += tmpSize	
				}

				if(showMaximum==cntShow) break		
			}

			
			//
			tmpOrder = {
				price:null,
				size:null,
				total:null,
				scale:''
			}

			cntShow = 0
			for(var price = startSellPrice;;price += 0.5)
			{
				var tmpViewPrice = currentSellViewPrice
				if(this.orderBook[price]==undefined)
					continue
				var tmpSize = this.orderBook[price].size;

				if(currentSellViewPrice<price)
				{
					currentSellViewPrice += gapPrice

					if(tmpOrder['size']>this.orderGroupAlaram[gapPrice][0])
						tmpOrder['scale'] = 'wow'

					if(tmpOrder['size']>this.orderGroupAlaram[gapPrice][1])
						tmpOrder['scale'] = 'awwwwwwww'

					tmpOrder['total'] = new Intl.NumberFormat('en-US').format(totalSell)
					tmpOrder['size'] = new Intl.NumberFormat('en-US').format(tmpOrder['size'])
					tmpOrder['price'] = new Intl.NumberFormat('en-US').format(tmpOrder['price'].toFixed(1))
					if(tmpOrder['price'].indexOf('.')==-1)
						tmpOrder['price'] += '.0'

					sellOrderList.push(tmpOrder)

					tmpOrder = {
						price:null,
						size:null,
						total:null
					}
					cntShow += 1
				}

				totalSell += tmpSize
				
				if(tmpOrder['price']==null)
				{
					tmpOrder['price'] = currentSellViewPrice
					tmpOrder['size'] = tmpSize
				}
				else
				{
					tmpOrder['size'] += tmpSize	
				}

				
				if(showMaximum==cntShow) break
				
			}
			
			
			this.orderBuy = buyOrderList
			this.orderSell = sellOrderList
			if(this.isReady==false)
				this.isReady = true

		},15),
		setBidAsk:function(side,price){
			if(side == 'Sell' &&
				this.lastPrice <= price &&
				this.ask > price)
			{
				this.ask = price
			}

			if(side == 'Buy' &&
				this.lastPrice >= price &&
				this.bid < price)
			{
				this.bid = price
			}
		},
		getOrder:function(){
			var $this = this
			this.socket.onmessage = function(e){
				var res = JSON.parse(e.data)
				if(res.success === true)
				{
					var subscribe = res.subscribe.split(':')[0]
					if(subscribe === 'orderBookL2')
					{

					}
					else if(subscribe === 'instrument')
					{
						$this.subscribe.instrument = true
					}

				}
				if(res.table === 'instrument')
				{
					if(!!res.data[0].lastPrice)
					{
						$this.lastPrice = res.data[0].lastPrice
					}
					if(!!res.data[0].bidPrice && !!res.data[0].askPrice)
					{
						$this.bid = res.data[0].bidPrice
						$this.ask = res.data[0].askPrice
					}
				}

				if(res.table === 'trade')
				{
					var data = res.data
					for(var cnt in data)
					{
						var orderObj = data[cnt]
						$this.lastPriceSide = orderObj['side'];
					}
				}
				
				if(res.table === 'orderBookL2')
				{

					var data = res.data
					var action = res.action

					if(!$this.subscribe.orderbookL2 && action !== 'partial') return

					if(action==='partial')
					{

						
						for(var cnt in data)
						{
							var orderObj = data[cnt]
							var orderId = orderObj['id']

							$this.setBidAsk(orderObj['side'],orderObj['price'])

							$this.order[orderId] = orderObj
							$this.orderBook[orderObj['price']] = {
								side:orderObj['side'],
								size:orderObj['size']
							}

						}
						$this.subscribe.orderbookL2 = true
					}
					else if(action==='insert')
					{
						for(var cnt in data)
						{
							var orderObj = data[cnt]
							var orderId = orderObj['id']

							$this.setBidAsk(orderObj['side'],orderObj['price'])

							$this.order[orderId] = orderObj
							$this.orderBook[orderObj['price']] = {
								side:orderObj['side'],
								size:orderObj['size']
							}

							
						}
					}
					else if(action==='update')
					{

						for(var cnt in data)
						{
							var orderObj = data[cnt]
							var orderId = orderObj['id']
							if(!$this.order[orderId])
							{
								$this.order[orderId] = orderObj	
							}
							else
							{
								$this.order[orderId].side = orderObj['side']
								$this.order[orderId].size = orderObj['size']

								$this.setBidAsk(orderObj['side'],orderObj['price'])

								var tmpPrice = $this.order[orderId].price
								$this.orderBook[tmpPrice] = {
									side:orderObj['side'],
									size:orderObj['size']
								}

								
							}
						}
					}
					else if(action==='delete')
					{
						for(var cnt in data)
						{
							var orderObj = data[cnt]
							var orderId = orderObj['id']
							delete $this.order[orderId]
						}
					}
				}

				$this.drawOrderBook()

			}
		}
	},
	created: function(){
		var $this = this
		this.getOrder()
		this.socket.onopen = function(e){
			var indices = [
				'orderBookL2:XBTUSD',
				'instrument:XBTUSD',
				'trade:XBTUSD'
			]
			var op = {"op": "subscribe", "args": indices}
			$this.socket.send(JSON.stringify(op))
		}
		this.socket.onclose = function(e){}
		
		
	}
})

