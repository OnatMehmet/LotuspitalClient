import { Pipe, PipeTransform } from '@angular/core';
import { PersonnelModel } from '../../models/personnel.model';

@Pipe({
  name: 'personnel',
  standalone: true
})
export class PersonnelPipe implements PipeTransform {

  transform(value: PersonnelModel[], search: string): PersonnelModel[] {
    if(!search){
      return value;
    }

    return value.filter(p=> 
      p.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
      p.department.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    )
  }

}
