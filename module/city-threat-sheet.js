import { CityActorSheet } from "./city-actor-sheet.js";

export class CityThreatSheet extends CityActorSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			classes: ["city", "sheet", "actor"],
			template: "systems/city-of-mist/templates/threat-sheet.html",
			width: 700,
			height: 970,
			tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "moves"}]
		});
	}

	getData() {
		let data = super.getData();
		data.data.storyTags = this.getStoryTags();
		return data;
	}

	getStoryTags() {
		return this.actor.items.filter( x=> x.data.type == "tag" && x.data.data.subtype == "story").map( x=> {
			return {
				type: x.data.type,
				name: x.data.name,
				location: "",
				_id: x._id,
				data: x.data.data,
				ownerId: this.actor._id,
				owner: this.actor
			};
		});
	}

	activateListeners(html) {
		super.activateListeners(html);

		//Everything below here is only needed if the sheet is editable
		if (!this.options.editable) return;
		html.find('.alias-input').focusout(this._aliasInput.bind(this));
		html.find('.alias-input').change(this._aliasInput.bind(this));
		html.find('.create-gm-move').click(this._createGMMove.bind(this));
		html.find('.gm-moves-header').mousedown(CityHelpers.middleClick(this._createGMMove.bind(this)));
		html.find('.gmmove-delete').click(this._deleteGMMove.bind(this));
		html.find('.gmmove-edit').click(this._editGMMove.bind(this));
		html.find('.gmmove-select').click(this._selectGMMove.bind(this));
		html.find('.gmmove-select').mousedown(this._gmmoveRightMouseDown.bind(this));
		html.find('.gmmove-select').mousedown(CityHelpers.middleClick( this._editGMMove.bind(this)));
		html.find('.create-spectrum').click(this._createSpectrum.bind(this));
		html.find('.spectrum-editable').click(this._editSpectrum.bind(this));
		html.find('.spectrum-delete').click(this._deleteSpectrum.bind(this));
	}

	async _createSpectrum (event) {
		const owner = this.actor;
		const obj = await this.actor.createNewSpectrum("Unnamed Spectrum")
		const spec = await owner.getSpectrum(obj._id);
		const updateObj = await CityHelpers.itemDialog(spec);
		if (updateObj) {
		} else {
			await owner.deleteSpectrum(obj._id);
		}
	}

	async _editSpectrum(event) {
		const owner = this.actor;
		const id = getClosestData(event, "spectrumId");
		const spec = await owner.getSpectrum(id);
		await CityHelpers.itemDialog(spec);
	}

	async _deleteSpectrum(event) {
		event.preventDefault();
		event.stopPropagation();
		const owner = this.actor;
		const id = getClosestData(event, "spectrumId");
		const spec = await owner.getSpectrum(id);
		if (await this.confirmBox("Delete Status", `Delete ${spec.name}`)) {
			await owner.deleteSpectrum(id);
		}
	}

	async _aliasInput (event) {
		const val =  $(event.currentTarget).val();
		await this.actor.setTokenName(val);
	}

	async _createGMMove(event) {
		const owner = this.actor;
		const obj = await this.actor.createNewGMMove("Unnamed Move")
		const move = await owner.getGMMove(obj._id);
		await this.moveDialog(move);
		await move.updateGMMoveHTML();
	}

	async _deleteGMMove(event) {
		event.stopImmediatePropagation();
		const move_id = getClosestData(event, "moveId");
		const actorId = getClosestData(event, "ownerId");
		console.log(actorId);
		const owner = await this.getOwner(actorId);
		const move = await owner.getGMMove(move_id);
		if (await this.confirmBox("Delete Move", `Delete ${move.name}`)) {
			await owner.deleteClue(move_id);
		}
	}

	async _editGMMove(event) {
		const move_id = getClosestData(event, "moveId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const move = await owner.getGMMove(move_id);
		await this.moveDialog(move);
		await move.updateGMMoveHTML();
	}

	async _selectGMMove(event) {
		const move_id = getClosestData(event, "moveId");
		const ownerId = getClosestData(event, "ownerId");
		const owner = await this.getOwner(ownerId);
		const move = await owner.getGMMove(move_id);
		const {html, taglist, statuslist} = move.data.data;
		const name = this.actor.getDisplayedName();
		const processed_html = CityHelpers.nameSubstitution(html, {name});
		const options = { token: null ,
			speaker: {
				actor:this.actor,
				alias: this.actor.getDisplayedName()
			}
		};
		if (await this.sendToChatBox(move.name, processed_html, options)) {
			for (const tagname of taglist)
				await this.actor.createStoryTag(tagname);
			for (const {name, tier} of statuslist)
				await this.addOrCreateStatus(name, tier);
		}
	}

	async addOrCreateStatus (name2, tier2) {
		const actor = this.actor;
		let status = actor.hasStatus(name2);
		if (status) {
			const obj = await status.addStatus(tier2);
		} else {
			const obj = await actor.createNewStatus(name2, tier2);
		}
	}

	async moveDialog(item) {
		return await CityHelpers.itemDialog(item);
	}

	async _gmmoveRightMouseDown (event) {
		event.preventDefault();
		if (event.which == 3)
			this._editGMMove(event, true);
	}

}
